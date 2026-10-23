'use client';

import type { MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { Trans, useLingui } from '@lingui/react/macro';
import { Badge } from '@/components/ui/badge';
import type { Visibility } from '@/lib/api';

// label and hint are message descriptors: show them with i18n._()
export const VISIBILITY: Record<Visibility, { label: MessageDescriptor; hint: MessageDescriptor; available: boolean }> = {
  public: { label: msg`Public`, hint: msg`Anyone with the link, no sign-in`, available: true },
  login_only: { label: msg`Your organization`, hint: msg`Signed-in members of your organization`, available: true }, // TL-432
  team: { label: msg`Team only`, hint: msg`Coming soon`, available: false }, // stretch goal, not v1
};

export function VisibilityBadge({ value }: { value: Visibility }) {
  const { i18n } = useLingui();
  return <Badge variant={value === 'public' ? 'default' : 'secondary'}>{i18n._(VISIBILITY[value].label)}</Badge>;
}

type SelectProps = {
  name?: string; // set for plain <form> posts
  value?: Visibility; // controlled…
  defaultValue?: Visibility; // …or uncontrolled
  onChange?: (v: Visibility) => void;
  canPublish?: boolean; // false: you can't make it public or take it off public (org admins only, TL-432)
};

// Native radio group: keyboard + screen-reader support for free, works with or without JS.
export function VisibilitySelect({ name = 'visibility', value, defaultValue = 'public', onChange, canPublish = true }: SelectProps) {
  const { i18n } = useLingui();
  const current = value ?? defaultValue;
  return (
    <fieldset className="grid gap-2 sm:grid-cols-3">
      <legend className="mb-2 text-sm font-medium"><Trans>Who can see this roadmap?</Trans></legend>
      {!canPublish && (
        <p className="text-sm text-muted-foreground sm:col-span-3">
          {current === 'public' ? <Trans>It’s public: only organization admins can take it off public.</Trans> : <Trans>Only organization admins can make a roadmap public.</Trans>}
        </p>
      )}
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
                disabled={!available || (!canPublish && (v === 'public') !== (current === 'public'))}
                {...(value !== undefined ? { checked: value === v } : { defaultChecked: defaultValue === v })}
                onChange={onChange ? () => onChange(v) : undefined}
                className="accent-primary"
              />
              {i18n._(label)}
            </span>
            <span className="text-sm text-muted-foreground">{i18n._(hint)}</span>
          </label>
        );
      })}
    </fieldset>
  );
}
