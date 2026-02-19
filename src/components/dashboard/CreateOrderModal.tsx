import { useEffect } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, ShoppingBag, PackagePlus } from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useShop } from '@/hooks/useShop';
import { useDeliverySettings } from '@/hooks/useDeliverySettings';
import { useCreateOrder } from '@/hooks/useOrders';
import { formatCurrency } from '@/integrations/supabase/client';

// ─── Zod schema ────────────────────────────────────────────────────────────

const itemSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  quantity: z.coerce.number().int().min(1, 'Min 1'),
  unit_price: z.coerce.number().min(0, 'Prix invalide'),
});

const schema = z.object({
  customer_name: z.string().min(1, 'Nom requis'),
  phone: z.string().min(6, 'Téléphone requis'),
  city: z.string().min(1, 'Ville requise'),
  quartier: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1, 'Au moins un article'),
  delivery_fee: z.coerce.number().min(0),
  payment_method: z.enum(['cod', 'whatsapp']),
});

type FormValues = z.infer<typeof schema>;

// ─── Component ─────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CreateOrderModal({ open, onClose }: Props) {
  const { shop } = useShop();
  const shopId = shop?.id ?? '';
  const currency = (shop?.currency ?? 'XOF') as 'XOF';

  const { data: deliverySettings } = useDeliverySettings(shopId);
  const createOrder = useCreateOrder();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      customer_name: '',
      phone: '',
      city: '',
      quartier: '',
      notes: '',
      items: [{ name: '', quantity: 1, unit_price: 0 }],
      delivery_fee: 0,
      payment_method: 'cod',
    },
  });

  // Pre-fill delivery fee from shop settings when loaded
  useEffect(() => {
    if (deliverySettings?.has_delivery_fee && deliverySettings.delivery_fee > 0) {
      form.setValue('delivery_fee', deliverySettings.delivery_fee);
    }
  }, [deliverySettings, form]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      form.reset({
        customer_name: '',
        phone: '',
        city: '',
        quartier: '',
        notes: '',
        items: [{ name: '', quantity: 1, unit_price: 0 }],
        delivery_fee: deliverySettings?.has_delivery_fee ? deliverySettings.delivery_fee : 0,
        payment_method: 'cod',
      });
    }
  }, [open, form, deliverySettings]);

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' });

  // Live totals
  const watchedItems = useWatch({ control: form.control, name: 'items' });
  const watchedFee = useWatch({ control: form.control, name: 'delivery_fee' });

  const subtotal = (watchedItems ?? []).reduce((acc, item) => {
    return acc + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
  }, 0);
  const total = subtotal + (Number(watchedFee) || 0);

  const onSubmit = async (values: FormValues) => {
    try {
      await createOrder.mutateAsync({
        shopId,
        customer_name: values.customer_name,
        phone: values.phone,
        city: values.city,
        quartier: values.quartier ?? '',
        notes: values.notes ?? '',
        items: values.items as { name: string; quantity: number; unit_price: number }[],
        subtotal,
        delivery_fee: Number(values.delivery_fee) || 0,
        total,
        payment_method: values.payment_method,
      });
      toast.success('Commande créée avec succès ! 🎉');
      onClose();
    } catch (err) {
      toast.error(`Erreur : ${(err as Error).message}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="h-5 w-5 text-primary" />
            Nouvelle commande
          </DialogTitle>
          <DialogDescription>
            Créez manuellement une commande (téléphone, présentiel, WhatsApp…)
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

            {/* ── Section Client ───────────────────────────────────── */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">1</span>
                Informations client
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField control={form.control} name="customer_name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom du client *</FormLabel>
                    <FormControl><Input placeholder="Ex: Amadou Diallo" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Téléphone *</FormLabel>
                    <FormControl><Input placeholder="Ex: 221771234567" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="city" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ville *</FormLabel>
                    <FormControl><Input placeholder="Ex: Dakar" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="quartier" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quartier</FormLabel>
                    <FormControl><Input placeholder="Ex: Plateau" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes de livraison</FormLabel>
                  <FormControl>
                    <Input placeholder="Instructions spéciales, point de repère…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <Separator />

            {/* ── Section Articles ─────────────────────────────────── */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">2</span>
                Articles
              </h3>

              <div className="space-y-2">
                {/* Header row */}
                <div className="grid grid-cols-[1fr_80px_100px_36px] gap-2 px-1">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase">Produit</span>
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase">Qté</span>
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase">Prix unit.</span>
                  <span />
                </div>

                {fields.map((field, idx) => (
                  <div key={field.id} className="grid grid-cols-[1fr_80px_100px_36px] gap-2 items-start">
                    <FormField control={form.control} name={`items.${idx}.name`} render={({ field }) => (
                      <FormItem className="space-y-0">
                        <FormControl><Input placeholder="Nom du produit" {...field} /></FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name={`items.${idx}.quantity`} render={({ field }) => (
                      <FormItem className="space-y-0">
                        <FormControl>
                          <Input type="number" min={1} placeholder="1" {...field} className="text-center" />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name={`items.${idx}.unit_price`} render={({ field }) => (
                      <FormItem className="space-y-0">
                        <FormControl>
                          <Input type="number" min={0} placeholder="0" {...field} />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )} />

                    <Button
                      type="button" variant="ghost" size="icon"
                      className="h-10 w-9 text-destructive hover:bg-destructive/10 flex-shrink-0"
                      onClick={() => fields.length > 1 && remove(idx)}
                      disabled={fields.length === 1}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button
                type="button" variant="outline" size="sm"
                className="h-8 gap-1.5 text-xs border-dashed"
                onClick={() => append({ name: '', quantity: 1, unit_price: 0 })}
              >
                <Plus className="h-3.5 w-3.5" />
                Ajouter un article
              </Button>

              {/* Subtotal */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <span className="text-sm text-muted-foreground">Sous-total :</span>
                <span className="text-sm font-semibold text-foreground">
                  {formatCurrency(subtotal, currency)}
                </span>
              </div>
            </div>

            <Separator />

            {/* ── Section Livraison & Paiement ─────────────────────── */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">3</span>
                Livraison & Paiement
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                <FormField control={form.control} name="delivery_fee" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frais de livraison</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="payment_method" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mode de paiement</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        {[
                          { value: 'cod', label: '💵 Livraison (COD)' },
                          { value: 'whatsapp', label: '💬 WhatsApp' },
                        ].map(opt => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => field.onChange(opt.value)}
                            className={`flex-1 py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                              field.value === opt.value
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border bg-background text-muted-foreground hover:border-primary/40'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Total */}
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-foreground">Total à payer</span>
                </div>
                <span className="text-lg font-bold text-primary">
                  {formatCurrency(total, currency)}
                </span>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={createOrder.isPending}
                className="gap-1.5"
              >
                {createOrder.isPending ? (
                  <>
                    <span className="h-3.5 w-3.5 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                    Création…
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" />
                    Créer la commande
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
