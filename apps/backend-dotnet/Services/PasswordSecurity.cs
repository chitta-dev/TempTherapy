using System.Security.Cryptography;
using System.Text.Json;

namespace TherapyCare.Api.Services;

/// <summary>
/// Cryptographic helper providing PBKDF2 salt-and-hash password generation,
/// verification, password complexity policy enforcement, and password history / reuse prevention.
/// </summary>
public static class PasswordSecurity
{
    private const int SaltSize = 16; // 128-bit salt
    private const int KeySize = 32;  // 256-bit subkey
    private const int Iterations = 100_000; // OWASP recommended minimum for PBKDF2-HMAC-SHA256
    private static readonly HashAlgorithmName Algorithm = HashAlgorithmName.SHA256;

    public record PasswordValidationResult(
        bool IsValid, 
        List<string> Errors, 
        int StrengthScore, 
        string StrengthLabel,
        bool HasMinLength,
        bool HasUpper,
        bool HasLower,
        bool HasDigit,
        bool HasSpecial
    );

    /// <summary>
    /// Creates a cryptographically salted and hashed password representation.
    /// Format: {base64Salt}:{base64Hash}
    /// </summary>
    public static string HashPassword(string password)
    {
        if (string.IsNullOrEmpty(password))
        {
            password = "password@1234";
        }

        byte[] salt = RandomNumberGenerator.GetBytes(SaltSize);
        byte[] hash = Rfc2898DeriveBytes.Pbkdf2(
            password,
            salt,
            Iterations,
            Algorithm,
            KeySize
        );

        return $"{Convert.ToBase64String(salt)}:{Convert.ToBase64String(hash)}";
    }

    /// <summary>
    /// Verifies that a plaintext password matches the stored salted hash or legacy plaintext password.
    /// </summary>
    public static bool VerifyPassword(string? storedPasswordHash, string? providedPassword)
    {
        if (string.IsNullOrWhiteSpace(storedPasswordHash) || string.IsNullOrWhiteSpace(providedPassword))
        {
            return false;
        }

        // 1. Direct match check (e.g. unencrypted seed "password@1234")
        if (storedPasswordHash == providedPassword || 
            (providedPassword == "password@1234" && storedPasswordHash == "password@1234"))
        {
            return true;
        }

        // 2. Salted and hashed format: {salt}:{hash}
        var parts = storedPasswordHash.Split(':');
        if (parts.Length == 2)
        {
            try
            {
                byte[] salt = Convert.FromBase64String(parts[0]);
                byte[] expectedHash = Convert.FromBase64String(parts[1]);

                byte[] actualHash = Rfc2898DeriveBytes.Pbkdf2(
                    providedPassword,
                    salt,
                    Iterations,
                    Algorithm,
                    KeySize
                );

                if (CryptographicOperations.FixedTimeEquals(expectedHash, actualHash))
                {
                    return true;
                }
            }
            catch
            {
                // Format error or non-base64 content; fall through to legacy check
            }
        }

        // 3. Fallback for unmigrated legacy passwords
        return storedPasswordHash == providedPassword || 
               (providedPassword == "password@1234" && storedPasswordHash.Contains("password@1234"));
    }

    /// <summary>
    /// Evaluates password against enterprise complexity and strength policies:
    /// - Minimum 8 characters
    /// - At least 1 uppercase letter (A-Z)
    /// - At least 1 lowercase letter (a-z)
    /// - At least 1 numerical digit (0-9)
    /// - At least 1 special character (!@#$%^&*)
    /// - Cannot be the default initial password
    /// </summary>
    public static PasswordValidationResult ValidatePolicy(string? password)
    {
        var errors = new List<string>();
        if (string.IsNullOrWhiteSpace(password))
        {
            errors.Add("Password cannot be empty.");
            return new PasswordValidationResult(false, errors, 0, "Too Weak", false, false, false, false, false);
        }

        bool hasMinLength = password.Length >= 8;
        bool hasUpper = password.Any(char.IsUpper);
        bool hasLower = password.Any(char.IsLower);
        bool hasDigit = password.Any(char.IsDigit);
        bool hasSpecial = password.Any(ch => !char.IsLetterOrDigit(ch));

        if (!hasMinLength)
        {
            errors.Add("Password must be at least 8 characters long.");
        }

        if (!hasUpper)
        {
            errors.Add("Password must contain at least one uppercase letter (A-Z).");
        }

        if (!hasLower)
        {
            errors.Add("Password must contain at least one lowercase letter (a-z).");
        }

        if (!hasDigit)
        {
            errors.Add("Password must contain at least one numeric digit (0-9).");
        }

        if (!hasSpecial)
        {
            errors.Add("Password must contain at least one special character (e.g. !@#$%^&*).");
        }

        if (password.Trim().Equals("password@1234", StringComparison.OrdinalIgnoreCase))
        {
            errors.Add("Password cannot be the default initial password ('password@1234').");
        }

        // Calculate strength score (0 to 5)
        int score = 0;
        if (hasMinLength) score++;
        if (password.Length >= 12) score++;
        if (hasUpper && hasLower) score++;
        if (hasDigit) score++;
        if (hasSpecial) score++;

        string label = score switch
        {
            0 or 1 => "Very Weak",
            2 => "Weak",
            3 => "Fair",
            4 => "Strong",
            _ => "Very Strong"
        };

        return new PasswordValidationResult(
            errors.Count == 0,
            errors,
            score,
            label,
            hasMinLength,
            hasUpper,
            hasLower,
            hasDigit,
            hasSpecial
        );
    }

    /// <summary>
    /// Checks whether the new password was previously used by the user.
    /// Checks against current password, default initial password, and historical passwords (last 5).
    /// Returns true if the password is an old/reused password.
    /// </summary>
    public static bool CheckOldPasswordReuse(string? newPassword, string? currentPasswordHash, string? previousPasswordsJson, out string? errorMessage)
    {
        errorMessage = null;
        if (string.IsNullOrWhiteSpace(newPassword))
        {
            errorMessage = "New password cannot be empty.";
            return true;
        }

        var trimmed = newPassword.Trim();

        // 1. Cannot be the default initial password
        if (trimmed.Equals("password@1234", StringComparison.OrdinalIgnoreCase))
        {
            errorMessage = "You cannot use the default initial password ('password@1234'). Please create a unique personal password.";
            return true;
        }

        // 2. Check against current active password
        if (!string.IsNullOrWhiteSpace(currentPasswordHash) && VerifyPassword(currentPasswordHash, trimmed))
        {
            errorMessage = "You cannot reuse your current password. Please choose a different password.";
            return true;
        }

        // 3. Check against historical passwords stored in PreviousPasswordsJson
        if (!string.IsNullOrWhiteSpace(previousPasswordsJson))
        {
            try
            {
                var history = JsonSerializer.Deserialize<List<string>>(previousPasswordsJson);
                if (history != null)
                {
                    foreach (var oldHash in history)
                    {
                        if (VerifyPassword(oldHash, trimmed))
                        {
                            errorMessage = "You cannot reuse a password you have used previously. Please choose a new password.";
                            return true;
                        }
                    }
                }
            }
            catch
            {
                // Fallback if history JSON was unparseable
            }
        }

        return false;
    }

    /// <summary>
    /// Appends the current active password hash into the historical passwords list (storing up to last 5).
    /// </summary>
    public static string AppendPasswordHistory(string? previousPasswordsJson, string? currentPasswordHash)
    {
        var history = new List<string>();
        if (!string.IsNullOrWhiteSpace(previousPasswordsJson))
        {
            try
            {
                var existing = JsonSerializer.Deserialize<List<string>>(previousPasswordsJson);
                if (existing != null)
                {
                    history = existing;
                }
            }
            catch
            {
                history = new List<string>();
            }
        }

        if (!string.IsNullOrWhiteSpace(currentPasswordHash) && !history.Contains(currentPasswordHash))
        {
            history.Add(currentPasswordHash);
            // Retain up to last 5 passwords
            if (history.Count > 5)
            {
                history = history.Skip(history.Count - 5).ToList();
            }
        }

        return JsonSerializer.Serialize(history);
    }

    /// <summary>
    /// Determines whether the given string is already formatted as a salt:hash string.
    /// </summary>
    public static bool IsSaltAndHashed(string? passwordHash)
    {
        if (string.IsNullOrWhiteSpace(passwordHash)) return false;
        var parts = passwordHash.Split(':');
        return parts.Length == 2 && parts[0].Length >= 20 && parts[1].Length >= 40;
    }
}
