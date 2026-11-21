import { ChangeDetectionStrategy, Component, Injectable, inject } from '@angular/core';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports, HlmDialogService } from '@spartan-ng/helm/dialog';
import { firstValueFrom } from 'rxjs';

interface ConfirmOptions {
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
}

/** Alert-dialog style confirmation. Resolves true when confirmed. */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private dialog = inject(HlmDialogService);

  async ask(options: ConfirmOptions): Promise<boolean> {
    const ref = this.dialog.open<boolean>(ConfirmDialogComponent, {
      context: options,
      contentClass: 'sm:max-w-sm',
      showCloseButton: false,
      role: 'alertdialog',
    });
    return (await firstValueFrom(ref.closed$)) === true;
  }
}

@Component({
  selector: 'app-confirm-dialog',
  imports: [HlmButtonImports, HlmDialogImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-4' },
  template: `
    <hlm-dialog-header>
      <h2 hlmDialogTitle>{{ ctx.title }}</h2>
      <p hlmDialogDescription>{{ ctx.description }}</p>
    </hlm-dialog-header>
    <hlm-dialog-footer>
      <button hlmBtn variant="outline" (click)="ref.close(false)">Cancel</button>
      <button hlmBtn [variant]="ctx.destructive ? 'destructive' : 'default'" (click)="ref.close(true)">{{ ctx.confirmLabel }}</button>
    </hlm-dialog-footer>
  `,
})
export class ConfirmDialogComponent {
  protected ref = inject(BrnDialogRef<boolean>);
  protected ctx = injectBrnDialogContext<ConfirmOptions>();
}
