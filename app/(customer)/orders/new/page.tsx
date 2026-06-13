import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ArrowLeft, Clock, FileSearch, Hammer, ReceiptText, Truck, Wrench, Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { NewOrderForm } from '@/components/customer/NewOrderForm'
import { PageHeader } from '@/components/shared/PageHeader'

export const metadata: Metadata = { title: 'PartBank — New Order' }

interface Props {
  searchParams: { partId?: string }
}

const RE_STEPS = [
  {
    icon: FileSearch,
    title: 'Submit your request',
    desc: 'Describe the part and attach reference photos or documents.',
  },
  {
    icon: Hammer,
    title: 'RE team reviews',
    desc: 'Our engineers identify the part and prepare technical drawings.',
  },
  {
    icon: ReceiptText,
    title: 'You receive a quote',
    desc: 'We send the RE fee and manufacturing cost estimate for your approval.',
  },
  {
    icon: Truck,
    title: 'Part manufactured & delivered',
    desc: 'Assigned to a verified workshop, then shipped directly to you.',
  },
]

const READY_STEPS = [
  {
    icon: FileSearch,
    title: 'Place your order',
    desc: 'Confirm quantity and add any production notes.',
  },
  {
    icon: Wrench,
    title: 'Workshop assigned',
    desc: 'We match your order to a verified workshop.',
  },
  {
    icon: ReceiptText,
    title: 'Quote confirmed',
    desc: 'You approve the manufacturing cost before work begins.',
  },
  {
    icon: Truck,
    title: 'Manufactured & delivered',
    desc: 'Workshop produces your part and ships it directly to you.',
  },
]

function InfoPanel({ isKnown }: { isKnown: boolean }) {
  const steps = isKnown ? READY_STEPS : RE_STEPS
  const accentClass = isKnown ? 'bg-green-50' : 'bg-navy-50'
  const iconClass = isKnown ? 'text-green-700' : 'text-navy-700'

  return (
    <div className="sticky top-6 space-y-4">
      <div className="bg-white rounded-xl border border-border p-5">
        <p className="text-xs font-semibold text-text-primary uppercase tracking-widest mb-5">
          How it works
        </p>
        <ol className="space-y-5">
          {steps.map((step, i) => {
            const Icon = step.icon
            return (
              <li key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${accentClass} shrink-0`}>
                    <Icon className={`h-3.5 w-3.5 ${iconClass}`} />
                  </div>
                  {i < steps.length - 1 && (
                    <div className="w-px flex-1 bg-border-strong mt-2 min-h-5" />
                  )}
                </div>
                <div className="pb-1">
                  <p className="text-xs font-semibold text-text-primary">{step.title}</p>
                  <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed">{step.desc}</p>
                </div>
              </li>
            )
          })}
        </ol>
      </div>

      <div className="rounded-xl border border-border bg-white p-4 flex items-start gap-3">
        <Clock className="h-4 w-4 text-text-muted mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-semibold text-text-primary">Typical turnaround</p>
          <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed">
            {isKnown
              ? '3–7 business days from order confirmation to delivery.'
              : '7–14 business days from RE fee payment to delivery, depending on part complexity.'}
          </p>
        </div>
      </div>

      {isKnown ? (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="text-[11px] font-semibold text-green-800 mb-1 flex items-center gap-1.5">
            <Zap className="h-3 w-3" />
            Technical drawing available
          </p>
          <p className="text-[11px] text-green-700 leading-relaxed">
            Reverse engineering is already done for this part. No RE fee — just manufacturing and delivery.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-4">
          <p className="text-[11px] font-semibold text-text-secondary mb-2">Tips for a faster response</p>
          <ul className="space-y-1.5">
            {[
              'Include the exact truck model and year',
              'Attach a photo of the damaged/worn part',
              'Mention part dimensions if known',
            ].map((tip) => (
              <li key={tip} className="flex items-start gap-2">
                <span className="mt-1 h-1 w-1 rounded-full bg-navy-700 shrink-0" />
                <span className="text-[11px] text-text-muted leading-relaxed">{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default async function NewOrderPage({ searchParams }: Props) {
  const partId = searchParams.partId

  if (!partId) {
    return (
      <div className="px-8 pt-7 pb-10">
        <Link
          href="/catalog"
          className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to catalog
        </Link>

        <PageHeader title="Request a Part" subtitle="Describe the part you need — the PartBank RE team will identify, engineer, and source it." />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
          <NewOrderForm />
          <InfoPanel isKnown={false} />
        </div>
      </div>
    )
  }

  const supabase = await createClient()
  const { data: part } = await supabase
    .from('parts')
    .select('id, name, drawing_url, manufacturability_grade, part_categories(name)')
    .eq('id', partId)
    .single()

  if (!part) notFound()

  const isKnown = !!part.drawing_url
  const category = Array.isArray(part.part_categories)
    ? part.part_categories[0]
    : part.part_categories

  return (
    <div className="px-8 pt-7 pb-10">
      <Link
        href="/catalog"
        className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to catalog
      </Link>

      <PageHeader
        title="Place an Order"
        subtitle={isKnown ? 'This part is ready to produce — confirm your order details.' : 'Review the part and confirm your order details.'}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <div className={`px-4 py-3 border-b ${isKnown ? 'bg-green-50 border-green-100' : 'bg-surface-secondary border-border'}`}>
              <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider">Selected Part</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-sm font-semibold text-text-primary">{part.name}</p>
              {(category as { name: string } | null)?.name && (
                <p className="text-xs text-text-muted mt-0.5">{(category as { name: string }).name}</p>
              )}
              {isKnown && (
                <div className="mt-2 inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-0.5">
                  <Zap className="h-3 w-3" />
                  Ready to produce
                </div>
              )}
            </div>
          </div>
          <NewOrderForm partId={part.id} isKnown={isKnown} />
        </div>
        <InfoPanel isKnown={isKnown} />
      </div>
    </div>
  )
}
