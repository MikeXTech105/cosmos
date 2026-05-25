import { useState } from 'react'
import axios from 'axios'

function App() {

  const [result, setResult] = useState('')

  const apiUrl = `${import.meta.env.VITE_API_URL}/test`

  const testHello = async () => {
    try {

      const res = await axios.get(`${apiUrl}/hello`)

      setResult(JSON.stringify(res.data))

    } catch (err) {

      setResult('API Failed')
    }
  }

  const testDb = async () => {
    try {

      const res = await axios.get(`${apiUrl}/db-test`)

      setResult(JSON.stringify(res.data))

    } catch (err) {

      setResult('Database Failed')
    }
  }

  return (
    <div style={{ padding: 40 }}>

      <h1>Cosmos ERP</h1>

      <button onClick={testHello}>
        Test API
      </button>

      <br /><br />

      <button onClick={testDb}>
        Test Database
      </button>

      <br /><br />

      <div>
        {result}
      </div>

    </div>
  )
}

export default App