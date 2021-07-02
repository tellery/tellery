import { useEffect } from 'react'
import { useHistory } from 'react-router'

const Page = () => {
  const history = useHistory()
  useEffect(() => {
    if (history.location.pathname === '/') {
      history.push('/stories')
    }
  }, [history])

  return <></>
}

export default Page
