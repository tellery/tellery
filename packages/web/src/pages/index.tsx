import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router'

const Page = () => {
  const navigate = useNavigate()
  const location = useLocation()
  useEffect(() => {
    if (location.pathname === '/') {
      navigate('/stories')
    }
  }, [location, navigate])

  return <></>
}

export default Page
