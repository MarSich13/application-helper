package dev.applicationhelper.importing;
import dev.applicationhelper.importing.ImportModels.*;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/imports")
public class ImportController {
    private final ImportService imports;
    public ImportController(ImportService imports) { this.imports = imports; }
    @PostMapping ImportResult importVacancies(@Valid @RequestBody ImportRequest request) { return imports.importVacancies(request); }
}
