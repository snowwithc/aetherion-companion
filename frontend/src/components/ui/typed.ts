/**
 * Typed re-exports of shadcn/ui primitives shipped as untyped .jsx.
 * This isolates the `as any` cast to one place so TSX call sites get full IntelliSense.
 */
import * as React from 'react';
import * as SwitchMod from '@/components/ui/switch';
import * as DrawerMod from '@/components/ui/drawer';
import * as DialogMod from '@/components/ui/dialog';

type AnyProps = { children?: React.ReactNode; className?: string; style?: React.CSSProperties };

export const Switch = SwitchMod.Switch as unknown as React.FC<AnyProps & {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  'data-testid'?: string;
}>;

export const Drawer = DrawerMod.Drawer as unknown as React.FC<AnyProps & {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  shouldScaleBackground?: boolean;
}>;
export const DrawerContent = DrawerMod.DrawerContent as unknown as React.FC<AnyProps & { 'data-testid'?: string }>;
export const DrawerTitle = DrawerMod.DrawerTitle as unknown as React.FC<AnyProps>;
export const DrawerDescription = DrawerMod.DrawerDescription as unknown as React.FC<AnyProps>;

export const Dialog = DialogMod.Dialog as unknown as React.FC<AnyProps & {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}>;
export const DialogContent = DialogMod.DialogContent as unknown as React.FC<AnyProps & { 'data-testid'?: string }>;
export const DialogHeader = DialogMod.DialogHeader as unknown as React.FC<AnyProps>;
export const DialogTitle = DialogMod.DialogTitle as unknown as React.FC<AnyProps & { 'data-testid'?: string }>;
export const DialogDescription = DialogMod.DialogDescription as unknown as React.FC<AnyProps>;
