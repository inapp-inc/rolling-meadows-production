const RATING_LEVELS = ['Low', 'Medium', 'High'];

type Domain = { key: string; label: string };

type Props = {
  prefix: string;
  domains: Domain[];
  ratings: Record<string, string>;
  disabled?: boolean;
  onChange: (ratings: Record<string, string>) => void;
};

export function RiskRatingsTable({ prefix, domains, ratings, disabled, onChange }: Props) {
  function setRating(domainKey: string, level: string) {
    onChange({ ...ratings, [domainKey]: level });
  }

  return (
    <table className="data-table rating-table">
      <thead>
        <tr>
          <th>Domain</th>
          {RATING_LEVELS.map((level) => (
            <th key={level}>{level}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {domains.map((domain) => (
          <tr key={domain.key}>
            <td>{domain.label}</td>
            {RATING_LEVELS.map((level) => {
              const name = `${prefix}-${domain.key}`;
              const checked = (ratings[domain.key] ?? 'Low') === level;
              return (
                <td key={level} className={checked ? 'rating-cell-active' : 'rating-cell'}>
                  <input
                    type="radio"
                    name={name}
                    value={level}
                    checked={checked}
                    disabled={disabled}
                    onChange={() => setRating(domain.key, level)}
                  />
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
