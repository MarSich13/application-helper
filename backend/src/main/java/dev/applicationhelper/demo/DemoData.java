package dev.applicationhelper.demo;
import dev.applicationhelper.api.ApiModels.*;
import dev.applicationhelper.application.ApplicationService;
import dev.applicationhelper.auth.UserService;
import dev.applicationhelper.importing.*;
import dev.applicationhelper.importing.ImportModels.*;
import dev.applicationhelper.model.*;
import dev.applicationhelper.repository.UserRepository;
import org.springframework.boot.*;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
@Component @Profile("demo")
public class DemoData implements ApplicationRunner {
    private final UserRepository users;
    private final UserService registration;
    private final ImportService imports;
    private final ApplicationService applications;
    public DemoData(UserRepository users, UserService registration, ImportService imports, ApplicationService applications) {
        this.users = users; this.registration = registration; this.imports = imports; this.applications = applications;
    }
    @Override @Transactional
    public void run(ApplicationArguments arguments) {
        if (users.existsByEmail("demo@example.com")) return;
        AppUser user = registration.register(new RegisterRequest("demo@example.com", "Alex Morgan", "DemoPassword123!"));
        String[][] data = {
            {"Java Backend Developer","CyberCube","London, UK","REMOTE","Middle","£65,000 – £85,000","java,spring boot,postgresql"},
            {"Full Stack Engineer","Northstar","Berlin, Germany","HYBRID","Middle","€70,000 – €90,000","java,react,typescript"},
            {"Frontend Developer","Wise","Tallinn, Estonia","REMOTE","Junior","€35,000 – €48,000","react,typescript,css"},
            {"Software Engineer","Linear Labs","Amsterdam, Netherlands","HYBRID","Middle","€65,000 – €80,000","java,spring boot,docker"},
            {"Backend Engineer","Monograph","Remote, Europe","REMOTE","Senior","€85,000 – €110,000","java,kafka,postgresql"},
            {"React Developer","Openfield","Kyiv, Ukraine","REMOTE","Middle","$3,000 – $4,500 / month","react,typescript,testing"},
            {"Junior Java Developer","Brightside","Warsaw, Poland","HYBRID","Junior","€28,000 – €38,000","java,spring boot,sql"},
            {"Platform Engineer","Orbit","London, UK","ONSITE","Senior","£90,000 – £115,000","java,kubernetes,aws"},
            {"Product Engineer","Forma","Remote, Europe","REMOTE","Middle","€60,000 – €80,000","typescript,react,node.js"},
            {"Python Backend Developer","Deepwater","Lisbon, Portugal","HYBRID","Middle","€50,000 – €65,000","python,postgresql,docker"},
            {"Java Software Engineer","Meridian","Prague, Czechia","HYBRID","Middle","€55,000 – €75,000","java,spring boot,aws"},
            {"Full Stack Developer","Papertrail","Remote, Europe","REMOTE","Junior","€32,000 – €45,000","java,react,postgresql"},
            {"Senior Backend Developer","Evergreen","Berlin, Germany","REMOTE","Senior","€90,000 – €120,000","java,kafka,kubernetes"},
            {"Frontend Engineer","Sunday Studio","Copenhagen, Denmark","HYBRID","Middle","€65,000 – €85,000","react,typescript,accessibility"},
            {"Backend Developer","Kindred","Helsinki, Finland","HYBRID","Junior","€38,000 – €48,000","java,spring boot,postgresql"},
            {"Software Developer","Waypoint","Stockholm, Sweden","ONSITE","Middle","€60,000 – €80,000","java,docker,sql"},
            {"Web Application Developer","Fieldwork","Remote, Europe","REMOTE","Middle","€55,000 – €75,000","react,typescript,java"},
            {"Graduate Software Engineer","Acorn","Dublin, Ireland","HYBRID","Junior","€35,000 – €42,000","java,sql,testing"}
        };
        List<ImportItem> items = new ArrayList<>();
        for (int index=0; index<data.length; index++) {
            String[] row = data[index];
            String description = "Help " + row[1] + " build thoughtful software that people rely on. Join a collaborative team with a focus on maintainable code and practical engineering.\n\n"
                + "What you will do\n• Build and improve customer-facing features.\n• Design clear APIs and work closely with product and design.\n• Write meaningful tests and review code with your team.\n\n"
                + "What you bring\n• Experience with " + row[6].replace(",", ", ") + ".\n• Curiosity, clear communication and ownership of your work.\n\n"
                + "What we offer\nFlexible hours, a learning budget and a supportive engineering team.\n\nThis is fictional demonstration data, not a current job advertisement.";
            items.add(new ImportItem("demo-" + (index+1), row[0], row[1], row[2], WorkMode.valueOf(row[3]),
                row[4], row[5], description, "https://example.com/jobs/demo-" + (index+1), List.of(row[6].split(","))));
        }
        List<Long> ids = imports.importVacancies(new ImportRequest("demo", items)).vacancyIds();
        for (int index=0; index<10; index++) {
            ApplicationView application = applications.track(user.getId(), ids.get(index));
            if (index < 7) application = applications.status(user.getId(), application.id(), new StatusRequest(ApplicationStatus.APPLIED, application.version()));
            if (index < 3) application = applications.status(user.getId(), application.id(), new StatusRequest(ApplicationStatus.INTERVIEW, application.version()));
            if (index == 0) application = applications.status(user.getId(), application.id(), new StatusRequest(ApplicationStatus.OFFER, application.version()));
            if (index == 6) application = applications.status(user.getId(), application.id(), new StatusRequest(ApplicationStatus.REJECTED, application.version()));
            applications.notes(user.getId(), application.id(), new NotesRequest(index == 0 ?
                "Recruiter call went well. Prepare examples of API design and a reliable import workflow.\n\nQuestions to ask:\n• How does the team review technical decisions?\n• What would success look like in the first three months?" :
                "Review the role and tailor my CV before the next conversation.", application.version()));
        }
    }
}
