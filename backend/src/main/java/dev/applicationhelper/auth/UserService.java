package dev.applicationhelper.auth;
import dev.applicationhelper.api.*;
import dev.applicationhelper.api.ApiModels.RegisterRequest;
import dev.applicationhelper.model.AppUser;
import dev.applicationhelper.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.security.Principal;
import java.time.Instant;
import java.util.Locale;
@Service
public class UserService {
    private final UserRepository users;
    private final PasswordEncoder passwords;
    public UserService(UserRepository users, PasswordEncoder passwords) { this.users = users; this.passwords = passwords; }
    @Transactional
    public AppUser register(RegisterRequest input) {
        String email = input.email().trim().toLowerCase(Locale.ROOT);
        if (input.password().getBytes(StandardCharsets.UTF_8).length > 72)
            throw ApiException.badRequest("Password must be at most 72 UTF-8 bytes.");
        if (users.existsByEmail(email)) throw ApiException.conflict("An account with this email already exists.");
        AppUser user = new AppUser();
        user.setEmail(email); user.setDisplayName(input.displayName().trim());
        if (user.getDisplayName().length() < 2) throw ApiException.badRequest("Name must contain at least two characters.");
        user.setPasswordHash(passwords.encode(input.password())); user.setCreatedAt(Instant.now());
        return users.saveAndFlush(user);
    }
    @Transactional(readOnly = true)
    public AppUser current(Principal principal) {
        if (principal == null) throw new ApiException(org.springframework.http.HttpStatus.UNAUTHORIZED, "Please sign in.");
        return users.findByEmail(principal.getName()).orElseThrow(ApiException::notFound);
    }
}
