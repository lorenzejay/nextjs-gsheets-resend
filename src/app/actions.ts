'use server'

import { google } from 'googleapis'
import { revalidatePath } from 'next/cache'
import { Resend } from 'resend'

function getCurrentDateTime(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = (now.getMonth() + 1).toString().padStart(2, '0') // Months are 0-based in JavaScript, so add 1
  const day = now.getDate().toString().padStart(2, '0')
  const hours = now.getHours().toString().padStart(2, '0')
  const minutes = now.getMinutes().toString().padStart(2, '0')
  const seconds = now.getSeconds().toString().padStart(2, '0')

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

export async function addToContactListAction(_: any, formData: FormData) {
  console.log('formData', formData)
  const Name = formData.get('name')

  const Email = formData.get('email')
  const Company = formData.get('company')
  const Mobile_Phone = formData.get('phone')

  const Message = formData.get('message')
  const Signup_Date = getCurrentDateTime()
  if (!Email || !Name || !Company || !Mobile_Phone || !Signup_Date)
    throw new Error('Missing form entries')

  const private_key = process.env.GOOGLE_PRIVATE_KEY?.replace(/['"]/g, '')

  if (!private_key) throw new Error('no key')
  try {
    const auth = await google.auth.getClient({
      projectId: process.env.GOOGLE_PROJECT_ID,
      credentials: {
        type: 'service_account',
        private_key: private_key?.replace(/\\n/g, '\n'),
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        client_id: process.env.GOOGLE_CLIENT_ID,
        token_url: process.env.GOOGLE_TOKEN_URL,
        universe_domain: 'googleapis.com',
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      // keyFile: 'path-to-your-service-account-key.json', // Replace with the path to your service account key file
      // scopes: 'https://www.googleapis.com/auth/spreadsheets',
    })

    const sheets = google.sheets({ version: 'v4', auth })
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID
    // const { data } = req.body
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Inquiry',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[Email, Name, Company, Mobile_Phone, Message, Signup_Date]], // Data must be an array of arrays (each inner array represents a row)
      },
    })
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: 'hello@domain.com',
      to: Email as string,
      subject: 'We recieved your contact and will get to you within 24 Hours.',
      html: `
      <p>Hi, ${Name}.</p>
      <p>Thank you for reaching out to us. We appreciate your inquiry and value the opportunity to connect with you.</p>
      <p>We’ve received your message and will get back to you within 24 hours.</p>
      <br/>
      <p>Best Regards,</p>
      <p>Lorenze</p>
      `,
    })
    // then notify me that someone signed up
    await resend.emails.send({
      from: 'alert@domain.com',
      to: 'lorenze@domain.com',
      subject: `New Contact Inquiry from ${Name}`,
      html: `
      Details:
      <b>Name:</b> ${Name}
      <br />
      <b>Email:</b> ${Email}
      <br />
      <b>Company:</b> ${Company}
      <br />
      <b>Phone Number:</b> ${Mobile_Phone}
      <br />
      <b>Message:</b> ${Message}
      `,
    })

    revalidatePath('/')
    return { message: 'Successfully signed up' }
  } catch (error: any) {
    console.log('contact submit error:', error)
    return { message: 'Failed contact' }
  }
}
