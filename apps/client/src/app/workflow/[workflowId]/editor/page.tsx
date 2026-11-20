import { auth } from '@clerk/nextjs/server'
import WorkflowPage from './_components/workflowPage'
import Unauthorized from '@/components/unauthorized'
import WorkflowProvider from '@/components/provider/WorkflowProvider'

type Props = {
  params: Promise<{ workflowId: string }>
}

export default async function Page({ params }: Props) {
  const localAuthBypass =
    process.env.NODE_ENV === 'development' &&
    process.env.LOCAL_AUTH_BYPASS === 'true'
  const userId = localAuthBypass ? 'local-dev-user' : (await auth()).userId
  const { workflowId } = await params

  if (!userId) {
    return <Unauthorized />
  }

  return <>
    <WorkflowProvider>
      <WorkflowPage workflowId={workflowId} />
    </WorkflowProvider>
  </>
}
