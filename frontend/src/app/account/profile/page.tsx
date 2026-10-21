'use client';

import { type FormEvent, useId, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { useAuthStore, type AddressInput } from '@/store/authStore';
import type { CustomerUser } from '@/types/user';

// The shared Button's outline/secondary styles are made for the dark page; these cards are white.
const onWhiteButton = 'border border-slate-300 bg-white text-slate-700 shadow-none hover:bg-slate-100';

const inputClass =
  'w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-black focus:border-brand-primary focus:outline-none';

function Labelled({ label, children }: { label: string; children: (id: string) => React.ReactNode }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
      </label>
      {children(id)}
    </div>
  );
}

function ProfileCard({ user }: { user: CustomerUser }) {
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const isDirty = name.trim() !== user.name || email.trim() !== (user.email ?? '');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    const result = await updateProfile({ name: name.trim(), email: email.trim() });
    setIsSaving(false);
    if (result.ok) toast.success('Profile updated');
    else toast.error(result.message);
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 rounded-xl border border-slate-100 bg-white p-5">
      <h2 className="mb-4 text-sm font-bold text-slate-800">Account Details</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Labelled label="Name">
          {(id) => <input id={id} required minLength={2} value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />}
        </Labelled>
        <Labelled label="Email">
          {(id) => (
            <input id={id} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Optional" className={inputClass} />
          )}
        </Labelled>
        <Labelled label="Phone">
          {(id) => <input id={id} value={user.phone} readOnly className={`${inputClass} bg-slate-50 text-slate-500`} />}
        </Labelled>
      </div>
      <p className="mt-2 text-xs text-slate-500">Your phone number is your sign-in and can&apos;t be changed here.</p>
      <Button type="submit" size="sm" className="mt-4" isLoading={isSaving} disabled={!isDirty}>
        Save changes
      </Button>
    </form>
  );
}

const emptyAddress: AddressInput = { label: 'Home', fullAddress: '', area: 'inside_dhaka', isDefault: false };

function AddressForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: AddressInput;
  submitLabel: string;
  onSubmit: (value: AddressInput) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    const ok = await onSubmit({ ...value, label: value.label.trim() || 'Home', fullAddress: value.fullAddress.trim() });
    setIsSaving(false);
    if (ok) onCancel();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Labelled label="Label">
          {(id) => (
            <input id={id} maxLength={30} value={value.label} onChange={(e) => setValue({ ...value, label: e.target.value })} placeholder="Home, Office…" className={inputClass} />
          )}
        </Labelled>
        <Labelled label="Delivery area">
          {(id) => (
            <select id={id} value={value.area} onChange={(e) => setValue({ ...value, area: e.target.value as AddressInput['area'] })} className={inputClass}>
              <option value="inside_dhaka">Inside Dhaka</option>
              <option value="outside_dhaka">Outside Dhaka</option>
            </select>
          )}
        </Labelled>
      </div>
      <Labelled label="Full address">
        {(id) => (
          <input id={id} required minLength={5} value={value.fullAddress} onChange={(e) => setValue({ ...value, fullAddress: e.target.value })} placeholder="House, road, area, city" className={inputClass} />
        )}
      </Labelled>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={Boolean(value.isDefault)} onChange={(e) => setValue({ ...value, isDefault: e.target.checked })} />
        Use as my default address
      </label>
      <div className="flex gap-2">
        <Button type="submit" size="sm" isLoading={isSaving}>
          {submitLabel}
        </Button>
        <Button type="button" size="sm" variant="secondary" className={onWhiteButton} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function AddressesCard({ user }: { user: CustomerUser }) {
  const { addAddress, updateAddress, deleteAddress } = useAuthStore();
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const addresses = user.addresses ?? [];

  async function run(action: Promise<{ ok: boolean; message: string }>, success: string) {
    const result = await action;
    if (result.ok) toast.success(success);
    else toast.error(result.message);
    return result.ok;
  }

  return (
    <div className="mb-6 rounded-xl border border-slate-100 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-800">Saved Addresses</h2>
        {editingId !== 'new' && addresses.length < 10 && (
          <Button type="button" size="sm" variant="secondary" className={onWhiteButton} onClick={() => setEditingId('new')}>
            <Plus className="h-3.5 w-3.5" /> Add address
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {editingId === 'new' && (
          <AddressForm
            initial={{ ...emptyAddress, isDefault: addresses.length === 0 }}
            submitLabel="Save address"
            onSubmit={(value) => run(addAddress(value), 'Address saved')}
            onCancel={() => setEditingId(null)}
          />
        )}

        {addresses.length === 0 && editingId !== 'new' && (
          <p className="text-sm text-slate-500">No saved addresses yet — add one to speed up checkout.</p>
        )}

        {addresses.map((addr) =>
          editingId === addr._id ? (
            <AddressForm
              key={addr._id}
              initial={{ label: addr.label, fullAddress: addr.fullAddress, area: addr.area, isDefault: addr.isDefault }}
              submitLabel="Save changes"
              onSubmit={(value) => run(updateAddress(addr._id, value), 'Address updated')}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div key={addr._id} className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 p-3 text-sm">
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-semibold text-slate-800">
                  {addr.label}
                  {addr.isDefault && (
                    <span className="rounded bg-brand-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-brand-primary">Default</span>
                  )}
                </p>
                <p className="break-words text-slate-600">{addr.fullAddress}</p>
                <p className="text-xs text-slate-500">{addr.area === 'inside_dhaka' ? 'Inside Dhaka' : 'Outside Dhaka'}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {!addr.isDefault && (
                  <button type="button" onClick={() => void run(updateAddress(addr._id, { isDefault: true }), 'Default address changed')} className="rounded px-2 py-1 text-xs font-semibold text-brand-primary hover:bg-slate-100">
                    Make default
                  </button>
                )}
                <button type="button" aria-label={`Edit ${addr.label}`} onClick={() => setEditingId(addr._id)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100">
                  <Pencil className="h-4 w-4" />
                </button>
                <button type="button" aria-label={`Delete ${addr.label}`} onClick={() => void run(deleteAddress(addr._id), 'Address removed')} className="rounded p-1.5 text-red-600 hover:bg-red-50">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

function PasswordCard() {
  const changePassword = useAuthStore((s) => s.changePassword);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    const result = await changePassword(current, next);
    setIsSaving(false);
    if (result.ok) {
      toast.success('Password changed');
      setCurrent('');
      setNext('');
    } else {
      toast.error(result.message);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-100 bg-white p-5">
      <h2 className="mb-4 text-sm font-bold text-slate-800">Change Password</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Labelled label="Current password">
          {(id) => <input id={id} type="password" required autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className={inputClass} />}
        </Labelled>
        <Labelled label="New password">
          {(id) => (
            <input id={id} type="password" required minLength={6} autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="At least 6 characters" className={inputClass} />
          )}
        </Labelled>
      </div>
      <Button type="submit" size="sm" className="mt-4" isLoading={isSaving}>
        Change password
      </Button>
    </form>
  );
}

export default function AccountProfilePage() {
  const user = useAuthStore((s) => s.user);
  if (!user) return null;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-white">Profile &amp; Addresses</h1>
      {/* Keyed by id so the form fields start from the saved values if the account changes underneath. */}
      <ProfileCard key={user.id} user={user} />
      <AddressesCard user={user} />
      <PasswordCard />
    </div>
  );
}
