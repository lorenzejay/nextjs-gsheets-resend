'use client'

import { Button } from './ui/button'
import { useFormStatus } from 'react-dom'

const FormSubmitButton = () => {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={pending} className="mt-10">
      {pending ? 'Submitting...' : 'Let’s work together'}
    </Button>
  )
}

export default FormSubmitButton
