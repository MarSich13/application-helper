package dev.applicationhelper.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.Set;

@Entity
@Table(name = "vacancies")
public class Vacancy {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false) private String source;
    @Column(nullable = false) private String externalId;
    @Column(nullable = false) private String title;
    @Column(nullable = false) private String company;
    @Column(nullable = false) private String location = "";
    @Enumerated(EnumType.STRING) @Column(nullable = false)
    private WorkMode workMode = WorkMode.UNSPECIFIED;
    @Column(nullable = false) private String experience = "";
    @Column(nullable = false) private String salary = "";
    @Column(nullable = false, columnDefinition = "text") private String description;
    private String sourceUrl;
    @Column(nullable = false) private Instant createdAt;
    @Column(nullable = false) private Instant updatedAt;
    @ElementCollection
    @CollectionTable(name = "vacancy_technologies", joinColumns = @JoinColumn(name = "vacancy_id"))
    @Column(name = "technology")
    private Set<String> technologies = new LinkedHashSet<>();

    public Long getId() { return id; }
    public String getSource() { return source; }
    public void setSource(String value) { source = value; }
    public String getExternalId() { return externalId; }
    public void setExternalId(String value) { externalId = value; }
    public String getTitle() { return title; }
    public void setTitle(String value) { title = value; }
    public String getCompany() { return company; }
    public void setCompany(String value) { company = value; }
    public String getLocation() { return location; }
    public void setLocation(String value) { location = value; }
    public WorkMode getWorkMode() { return workMode; }
    public void setWorkMode(WorkMode value) { workMode = value; }
    public String getExperience() { return experience; }
    public void setExperience(String value) { experience = value; }
    public String getSalary() { return salary; }
    public void setSalary(String value) { salary = value; }
    public String getDescription() { return description; }
    public void setDescription(String value) { description = value; }
    public String getSourceUrl() { return sourceUrl; }
    public void setSourceUrl(String value) { sourceUrl = value; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant value) { createdAt = value; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant value) { updatedAt = value; }
    public Set<String> getTechnologies() { return technologies; }
}
