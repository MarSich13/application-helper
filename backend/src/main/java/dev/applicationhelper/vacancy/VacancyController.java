package dev.applicationhelper.vacancy;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class VacancyController {

    @GetMapping("/api/vacancies")
    public List<VacancyResponse> getVacancies() {
        return List.of(
                new VacancyResponse(1L, "Java Developer", "CyberCube"),
                new VacancyResponse(2L, "Python Web Developer", "Demo Company")
        );

    }
}
