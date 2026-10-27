package dev.applicationhelper.auth;
import dev.applicationhelper.repository.UserRepository;
import org.springframework.context.annotation.*;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import java.util.Locale;
@Configuration
public class SecurityConfig {
    @Bean PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(12); }
    @Bean UserDetailsService userDetailsService(UserRepository users) {
        return email -> users.findByEmail(email.trim().toLowerCase(Locale.ROOT))
            .map(user -> User.withUsername(user.getEmail()).password(user.getPasswordHash()).roles("USER").build())
            .orElseThrow(() -> new UsernameNotFoundException("Invalid email or password"));
    }
    @Bean SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http.authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/register", "/api/auth/login", "/api/auth/csrf",
                                 "/api/auth/config", "/actuator/health", "/error").permitAll()
                .anyRequest().authenticated())
            .formLogin(form -> form.loginProcessingUrl("/api/auth/login").usernameParameter("email")
                .successHandler((request, response, authentication) -> response.setStatus(204))
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
