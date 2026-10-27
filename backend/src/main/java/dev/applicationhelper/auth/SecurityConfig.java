package dev.applicationhelper.auth;
import dev.applicationhelper.repository.UserRepository;
import org.springframework.context.annotation.*;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.security.web.csrf.HttpSessionCsrfTokenRepository;
import java.util.Locale;
@Configuration
public class SecurityConfig {
    @Bean PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(12); }
    @Bean CsrfTokenRepository csrfTokenRepository() { return new HttpSessionCsrfTokenRepository(); }
    @Bean UserDetailsService userDetailsService(UserRepository users) {
        return email -> users.findByEmail(email.trim().toLowerCase(Locale.ROOT))
            .map(user -> User.withUsername(user.getEmail()).password(user.getPasswordHash()).roles("USER").build())
            .orElseThrow(() -> new UsernameNotFoundException("Invalid email or password"));
    }
    @Bean SecurityFilterChain securityFilterChain(HttpSecurity http, CsrfTokenRepository csrfTokens) throws Exception {
        http.csrf(csrf -> csrf.csrfTokenRepository(csrfTokens))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/register", "/api/auth/login", "/api/auth/csrf",
                                 "/api/auth/config", "/actuator/health", "/error").permitAll()
                .anyRequest().authenticated())
            .formLogin(form -> form.loginProcessingUrl("/api/auth/login").usernameParameter("email")
                .successHandler((request, response, authentication) -> {
                    // Initialize the rotated token before parallel first mutations can race to create it.
                    csrfTokens.saveToken(csrfTokens.generateToken(request), request, response);
                    response.setStatus(204);
                })
                .failureHandler((request, response, exception) -> {
                    response.setStatus(401); response.setContentType("application/problem+json");
                    response.getWriter().write("{\"status\":401,\"detail\":\"Invalid email or password.\"}");
                }))
            .logout(logout -> logout.logoutUrl("/api/auth/logout")
                .logoutSuccessHandler((request, response, authentication) -> response.setStatus(204)))
            .exceptionHandling(errors -> errors
                .authenticationEntryPoint((request, response, exception) -> {
                    response.setStatus(401); response.setContentType("application/problem+json");
                    response.getWriter().write("{\"status\":401,\"detail\":\"Please sign in to continue.\"}");
                })
                .accessDeniedHandler((request, response, exception) -> {
                    response.setStatus(403); response.setContentType("application/problem+json");
                    response.getWriter().write("{\"status\":403,\"detail\":\"Request rejected. Refresh the page and try again.\"}");
                }));
        // Session-backed CSRF protection remains enabled, including login and logout.
        return http.build();
    }
}
