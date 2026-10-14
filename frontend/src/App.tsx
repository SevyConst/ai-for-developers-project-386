import { Route, Routes } from "react-router"

import { BookPage } from "@/pages/book-page"
import { HomePage } from "@/pages/home-page"
import { NotFoundPage } from "@/pages/not-found-page"

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/book" element={<BookPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
