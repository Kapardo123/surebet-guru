import { Badge } from "@/components/ui/badge";

const sports = ["All", "Football", "Basketball", "Tennis", "MMA", "Baseball"];

interface SportFilterProps {
  active: string;
  onChange: (sport: string) => void;
}

const SportFilter = ({ active, onChange }: SportFilterProps) => {
  return (
    <div className="flex flex-wrap gap-2">
      {sports.map((sport) => (
        <Badge
          key={sport}
          variant={active === sport ? "sportActive" : "sport"}
          onClick={() => onChange(sport)}
          className="px-4 py-1.5 text-sm"
        >
          {sport}
        </Badge>
      ))}
    </div>
  );
};

export default SportFilter;
