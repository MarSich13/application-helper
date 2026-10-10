import './App.css'
import { useState } from 'react'
import type { Vacancy } from './types/vacancy'
import VacancyCard from './components/VacancyCard'

function App() {

  const initialVacancies: Vacancy[] = [
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

  const [vacancies, setVacancies] = useState<Vacancy[]>(initialVacancies)

  function clearVacancies(){
    setVacancies([])
  }


  return (
    <main>
      <h1>Application Helper</h1>

      <section>
        <h2>Vacancies</h2>

        <button type="button" onClick={() => clearVacancies()}>
          Clear list
        </button>

        {vacancies.length === 0 && <p>No vacancies found</p>}
        
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