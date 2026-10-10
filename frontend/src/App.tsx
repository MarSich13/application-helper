import './App.css'
import type { Vacancy } from './types/vacancy'
import VacancyCard from './components/VacancyCard'

function App() {

  const vacancies: Vacancy[] = [
    {
      id: 1,
      title: 'Java Developer',
      company: 'CyberCube'
    },
    {
      id: 2,
      title: 'Python Developer',
      company: 'Demo Company'
    },
    {
      id: 3,
      title: 'Frontend Developer',
      company: 'Wise'
    }
  ]

  return (
    <main>
      <h1>Application Helper</h1>

      <section>
        <h2>Vacancies</h2>
      

        
        {vacancies.map((vacancy) => (
          <VacancyCard
          key={vacancy.id}
          vacancy={vacancy}
          />
        ))}
        
      </section>
    </main>
  )
}

export default App