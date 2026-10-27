package dev.applicationhelper.application;
import dev.applicationhelper.api.ApiModels.*;
import dev.applicationhelper.auth.UserService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;
@RestController @RequestMapping("/api")
public class ApplicationController {
    private final ApplicationService applications;
    private final UserService users;
    public ApplicationController(ApplicationService applications, UserService users) { this.applications = applications; this.users = users; }
    @PutMapping("/vacancies/{vacancyId}/application")
    ApplicationView track(Principal principal, @PathVariable long vacancyId) { return applications.track(users.current(principal).getId(), vacancyId); }
    @GetMapping("/applications/{id}")
    ApplicationView get(Principal principal, @PathVariable long id) { return applications.get(users.current(principal).getId(), id); }
    @PutMapping("/applications/{id}/status")
    ApplicationView status(Principal principal, @PathVariable long id, @Valid @RequestBody StatusRequest input) {
        return applications.status(users.current(principal).getId(), id, input);
    }
    @PutMapping("/applications/{id}/notes")
    ApplicationView notes(Principal principal, @PathVariable long id, @Valid @RequestBody NotesRequest input) {
        return applications.notes(users.current(principal).getId(), id, input);
    }
    @GetMapping("/dashboard")
    DashboardView dashboard(Principal principal) { return applications.dashboard(users.current(principal).getId()); }
}
