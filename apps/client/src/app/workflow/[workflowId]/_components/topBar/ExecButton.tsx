'use cliennt'
import { useWorkflow } from '@/components/context/WorkflowProvider'
import { Button } from '@/components/ui/button'
import useExecutionPlan from '@/hooks/useExecutionPlan'
import { useRunWorkflow } from '@/hooks/workflows/mutation'
import { useReactFlow } from '@xyflow/react'
import { Loader2, PlayIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import React from 'react'

type Props = {
    workflowId: string
}

export default function ExecButton({ workflowId }: Props) {
    const generate = useExecutionPlan()
    const { toObject } = useReactFlow();
    const { mutateAsync, isPending } = useRunWorkflow();
    const router = useRouter();
    const { workflow } = useWorkflow();

    return (
        <Button variant={"outline"} className='cursor-pointer flex items-center gap-2'
            onClick={async () => {
                // const plan = generate();
                if (!workflow?.executionPlan) return;

                // if(!plan || plan.length === 0) return;

                const data = await mutateAsync({
                    workflowId,
                    executionPlan: workflow.executionPlan,
                })
                if (!data) return;
                router.push(`/workflow/${workflowId}/runs/${data.id}`)
            }}
        >
            {isPending ? <div>
                <Loader2 className='animate-spin stroke-orange-400' />
            </div> : <>
                <PlayIcon size={16} className='stroke-orange-400' />
                Execute
            </>
            }

        </Button>
    )
}