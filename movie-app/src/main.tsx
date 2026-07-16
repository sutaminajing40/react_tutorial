import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import './index.css'
import App from './App.tsx'
import MovieDetail from './MovieDetail.tsx'
import Favorites from './Favorites.tsx'
import Layout from './Layout.tsx'
import moviesLoader

const router = createBrowserRouter([
  {
    path: "/", Component: Layout, children: [
      { path: "/", Component: App, loader: moviesLoader},
      { path: "/movies/:id", Component: MovieDetail },
      { path: "/favorites", Component: Favorites }
    ]
  }
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
