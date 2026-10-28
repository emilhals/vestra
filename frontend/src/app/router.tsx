import { createBrowserRouter } from 'react-router'
import { HomePage } from '../features/home/HomePage.tsx'
import { Layout } from './Layout.tsx'

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [{ index: true, element: <HomePage /> }],
  },
])
