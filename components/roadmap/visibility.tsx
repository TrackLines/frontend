import { Badge } from '@/components/ui/badge';
import type { Visibility } from '@/lib/api';

export const VISIBILITY: Record<Visibility, { label: string; hint: string; available: boolean }> = {
  public: { label: 'Public', hint: 'Anyone with the link, no sign-in', available: true },
  login_only: { label: 'Signed-in users', hint: 'Any Tracklines account can read it', available: true },
  team: { label: 'Team only', hint: 'Coming soon', available: false }, // stretch goal, not v1
};

export function VisibilityBadge({ value }: { value: Visibility }) {
  return <Badge variant={value === 'public' ? 'default' : 'secondary'}>{VISIBILITY[value].label}</Badge>;
}

type SelectProps = {
  name?: string; // set for plain <form> posts
  value?: Visibility; // controlled…
  defaultValue?: Visibility; // …or uncontrolled
  onChange?: (v: Visibility) => void;
};

// Native radio group: keyboard + screen-reader support for free, works with or without JS.
export function VisibilitySelect({ name = 'visibility', value, defaultValue = 'public', onChange }: SelectProps) {
  return (
    <fieldset className="grid gap-2 sm:grid-cols-3">
      <legend className="mb-2 text-sm font-medium">Who can see this roadmap?</legend>
      {(Object.keys(VISIBILITY) as Visibility[]).map((v) => {
        const { label, hint, available } = VISIBILITY[v];
        return (
          <label
            key={v}
            className="flex cursor-pointer flex-col gap-1 rounded-lg border p-3 has-checked:border-primary has-checked:bg-primary/5 has-disabled:cursor-not-allowed has-disabled:opacity-50"
          >
            <span className="flex items-center gap-2 font-medium">
              <input
                type="radio"
                name={name}
                value={v}
                disabled={!available}
                {...(value !== undefined ? { checked: value === v } : { defaultChecked: defaultValue === v })}
                onChange={onChange ? () => onChange(v) : undefined}
                className="accent-primary"
              />
              {label}
            </span>
            <span className="text-sm text-muted-foreground">{hint}</span>
          </label>
        );
      })}
    </fieldset>
  );
}
