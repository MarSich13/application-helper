import './App.css'
import type { Vacancy } from './types/vacancy'
import VacancyCard from './components/VacancyCard'

function App() {

  const firstVacancy: Vacancy = {
    id: 1,
    title: 'Java Developer',
    company: 'CyberCube'
  }

  const secondVacancy: Vacancy = {
    id: 2,
    title: 'Python Developer',
    company: 'Demo Company'
  }

  return (
    <main>
      <h1>Application Helper</h1>

      <section>
        <h2>Vacancies</h2>
      

        <article>
          <VacancyCard vacancy={firstVacancy} />
          <VacancyCard vacancy={secondVacancy} />
        </article>
      </section>
    </main>
  )
}

export default App