/** Series wordmark: 形 brand mark, FORMA and the game name */
@customElement('forma-mark')
export class FormaMarkElement extends GemElement {
  @attribute name: string;
  @boolattribute small: boolean;

  @template()
  #render = () => html`
    <div class="flex flex-col items-center ${this.small ? 'gap-1' : 'gap-3'}">
      <span class="font-mark font-light leading-none text-text ${this.small ? 'text-5xl' : 'text-[96px]'}">形</span>
      <span class="font-sans font-medium tracking-[0.5em] pl-[0.5em] text-text ${this.small ? 'text-sm' : 'text-lg'}">FORMA</span>
      <span v-if=${!!this.name} class="label tracking-[0.42em] pl-[0.42em] text-accent">${this.name}</span>
    </div>
  `;
}
