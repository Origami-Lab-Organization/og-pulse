import { Card, CardContent } from '@/components/ui/card'
import { ProjectMetricCard, type ProjectMetricCardProps } from './ProjectMetricCard'

interface ProjectMetricsBarProps {
  cards: ProjectMetricCardProps[]
}

export function ProjectMetricsBar({ cards }: ProjectMetricsBarProps) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex divide-x overflow-x-auto">
          {cards.map((card) => (
            <ProjectMetricCard key={card.label} {...card} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
