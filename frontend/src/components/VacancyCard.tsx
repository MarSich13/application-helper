import type { Vacancy } from "../types/vacancy";

type VacancyCardProps = {
    vacancy: Vacancy
}

export default function VacancyCard({vacancy}: VacancyCardProps) {
    return (
    <article className="vacancy-card">
        <h3>{vacancy.title}</h3>
        <p>{vacancy.company}</p>
    </article>
  );
}