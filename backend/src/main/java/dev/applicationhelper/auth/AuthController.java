package dev.applicationhelper.auth;
import dev.applicationhelper.api.ApiModels.*;
import dev.applicationhelper.api.Views;
import jakarta.validation.Valid;
import org.springframework.core.env.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;
import java.util.Map;
@RestController @RequestMapping("/api/auth")
public class AuthController {
    private final UserService users;
    private final Environment environment;
    public AuthController(UserService users, Environment environment) { this.users = users; this.environment = environment; }
    @GetMapping("/csrf")
    Map<String, String> csrf(CsrfToken token) { return Map.of("token", token.getToken(), "headerName", token.getHeaderName()); }
    @GetMapping("/config")
    Map<String, Boolean> config() { return Map.of("demoEnabled", environment.acceptsProfiles(Profiles.of("demo"))); }
    @PostMapping("/register") @ResponseStatus(HttpStatus.CREATED)
    UserView register(@Valid @RequestBody RegisterRequest input) { return Views.user(users.register(input)); }
    @GetMapping("/me")
    UserView me(Principal principal) { return Views.user(users.current(principal)); }
}
