import { Route, Routes } from "react-router"

import { BookPage } from "@/pages/book-page"
import { HomePage } from "@/pages/home-page"

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/book" element={<BookPage />} />
    </Routes>
  )
}

export default App
