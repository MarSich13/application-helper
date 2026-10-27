package dev.applicationhelper.vacancy;
import dev.applicationhelper.api.ApiModels.*;
import dev.applicationhelper.auth.UserService;
import dev.applicationhelper.model.WorkMode;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;
@RestController @RequestMapping("/api/vacancies")
public class VacancyController {
    private final VacancyService vacancies;
    private final UserService users;
    public VacancyController(VacancyService vacancies, UserService users) { this.vacancies = vacancies; this.users = users; }
    @GetMapping
    PageResult<VacancyView> list(Principal principal, @RequestParam(required=false) String q,
        @RequestParam(required=false) String technology, @RequestParam(required=false) String location,
        @RequestParam(required=false) WorkMode workMode, @RequestParam(required=false) String experience,
        @RequestParam(required=false) String status, @RequestParam(defaultValue="false") boolean tracked,
        @RequestParam(defaultValue="newest") String sort, @RequestParam(defaultValue="0") int page,
        @RequestParam(defaultValue="12") int size) {
        return vacancies.search(users.current(principal).getId(), q, technology, location, workMode, experience, status, tracked, sort, page, size);
    }
    @GetMapping("/{id}")
    VacancyDetail detail(Principal principal, @PathVariable long id) { return vacancies.detail(users.current(principal).getId(), id); }
    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    VacancyView create(@Valid @RequestBody VacancyInput input) { return vacancies.create(input); }
}
