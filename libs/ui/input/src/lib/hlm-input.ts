import { Directive } from '@angular/core';
import { BrnFieldControlDescribedBy } from '@spartan-ng/brain/field';
import { BrnInput } from '@spartan-ng/brain/input';
import { classes } from '@spartan-ng/helm/utils';

@Directive({
	selector: '[hlmInput]',
	exportAs: 'hlmInput',
	hostDirectives: [
		{ directive: BrnInput, inputs: ['id', 'forceInvalid', 'aria-invalid'] },
		{ directive: BrnFieldControlDescribedBy, inputs: ['aria-describedby'] },
	],
	host: { 'data-slot': 'input' },
})
export class HlmInput {
	constructor() {
		classes(
			() =>
				'bg-muted border-transparent focus:bg-background focus:border-ring/60 focus:ring-ring/15 data-[matches-spartan-invalid=true]:ring-destructive/20 dark:data-[matches-spartan-invalid=true]:ring-destructive/40 data-[matches-spartan-invalid=true]:border-destructive dark:data-[matches-spartan-invalid=true]:border-destructive/50 h-10 rounded-xl border px-4 py-2 text-base transition-[color,background-color,box-shadow,border-color] file:h-7 file:text-sm file:font-medium focus:ring-4 data-[matches-spartan-invalid=true]:ring-3 md:text-sm file:text-foreground placeholder:text-muted-foreground w-full min-w-0 outline-none file:inline-flex file:border-0 file:bg-transparent disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
		);
	}
}
