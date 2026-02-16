import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export interface ContactData {
  phone: string;
  whatsapp_number: string;
  alt_contact_number: string;
  email: string;
  address_house: string;
  address_street: string;
  address_area: string;
  address_city: string;
  address_state: string;
  address_pin_zip: string;
  permanent_address_same: boolean;
  perm_address_house: string;
  perm_address_street: string;
  perm_address_area: string;
  perm_address_city: string;
  perm_address_state: string;
  perm_address_pin_zip: string;
}

interface Props {
  data: ContactData;
  onChange: (data: ContactData) => void;
  errors: Record<string, string>;
  disabled?: boolean;
}

export default function ContactStep({ data, onChange, errors, disabled }: Props) {
  const update = (partial: Partial<ContactData>) => onChange({ ...data, ...partial });

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="w-phone">Mobile Number <span className="text-destructive">*</span></Label>
          <Input id="w-phone" value={data.phone} onChange={(e) => update({ phone: e.target.value })} disabled={disabled} />
          {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="w-whatsapp">WhatsApp Number</Label>
          <Input id="w-whatsapp" value={data.whatsapp_number} onChange={(e) => update({ whatsapp_number: e.target.value })} disabled={disabled} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="w-alt">Alt Contact</Label>
          <Input id="w-alt" value={data.alt_contact_number} onChange={(e) => update({ alt_contact_number: e.target.value })} disabled={disabled} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="w-email">Email Address</Label>
        <Input id="w-email" type="email" value={data.email} onChange={(e) => update({ email: e.target.value })} disabled={disabled} />
        {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
      </div>

      {/* Current Address */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Current Address</h4>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="w-house">House / Flat</Label>
            <Input id="w-house" value={data.address_house} onChange={(e) => update({ address_house: e.target.value })} disabled={disabled} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="w-street">Street</Label>
            <Input id="w-street" value={data.address_street} onChange={(e) => update({ address_street: e.target.value })} disabled={disabled} />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="w-area">Area / Locality</Label>
            <Input id="w-area" value={data.address_area} onChange={(e) => update({ address_area: e.target.value })} disabled={disabled} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="w-city">City</Label>
            <Input id="w-city" value={data.address_city} onChange={(e) => update({ address_city: e.target.value })} disabled={disabled} />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="w-state">State</Label>
            <Input id="w-state" value={data.address_state} onChange={(e) => update({ address_state: e.target.value })} disabled={disabled} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="w-pin">PIN / ZIP Code</Label>
            <Input id="w-pin" value={data.address_pin_zip} onChange={(e) => update({ address_pin_zip: e.target.value })} disabled={disabled} />
          </div>
        </div>
      </div>

      {/* Permanent Address */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Checkbox
            id="w-same-addr"
            checked={data.permanent_address_same}
            onCheckedChange={(v) => update({ permanent_address_same: !!v })}
            disabled={disabled}
          />
          <Label htmlFor="w-same-addr" className="font-normal cursor-pointer">Permanent address same as current</Label>
        </div>

        {!data.permanent_address_same && (
          <>
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Permanent Address</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>House / Flat</Label>
                <Input value={data.perm_address_house} onChange={(e) => update({ perm_address_house: e.target.value })} disabled={disabled} />
              </div>
              <div className="space-y-2">
                <Label>Street</Label>
                <Input value={data.perm_address_street} onChange={(e) => update({ perm_address_street: e.target.value })} disabled={disabled} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Area / Locality</Label>
                <Input value={data.perm_address_area} onChange={(e) => update({ perm_address_area: e.target.value })} disabled={disabled} />
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Input value={data.perm_address_city} onChange={(e) => update({ perm_address_city: e.target.value })} disabled={disabled} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>State</Label>
                <Input value={data.perm_address_state} onChange={(e) => update({ perm_address_state: e.target.value })} disabled={disabled} />
              </div>
              <div className="space-y-2">
                <Label>PIN / ZIP Code</Label>
                <Input value={data.perm_address_pin_zip} onChange={(e) => update({ perm_address_pin_zip: e.target.value })} disabled={disabled} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
