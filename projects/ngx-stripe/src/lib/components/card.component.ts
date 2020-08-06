import {
  Component,
  Input,
  ViewChild,
  ElementRef,
  EventEmitter,
  Output,
  OnInit,
  OnChanges,
  SimpleChanges,
  OnDestroy
} from '@angular/core';

import {
  StripeElementsOptions,
  StripeCardElementOptions,
  StripeCardElement,
  StripeElements,
  StripeCardElementChangeEvent
} from '@stripe/stripe-js';

import { StripeInstance } from '../services/stripe-instance.class';
import { StripeElementsService } from '../services/stripe-elements.service';

@Component({
  selector: 'ngx-stripe-card',
  template: `<div class="field" #stripeElementRef></div>`
})
export class StripeCardComponent implements OnInit, OnChanges, OnDestroy {
  @ViewChild('stripeElementRef', { static: false })
  public stripeElementRef!: ElementRef;
  element!: StripeCardElement;

  @Input() containerClass: string;
  @Input() options: Partial<StripeCardElementOptions>;
  @Input() elementsOptions: Partial<StripeElementsOptions>;
  @Input() stripe: StripeInstance;

  @Output() load = new EventEmitter<StripeCardElement>();

  @Output() blur = new EventEmitter<void>();
  @Output() change = new EventEmitter<StripeCardElementChangeEvent>();
  @Output() focus = new EventEmitter<void>();
  @Output() ready = new EventEmitter<void>();
  @Output() escape = new EventEmitter<void>();

  elements: StripeElements;
  state: 'notready' | 'starting' | 'ready' = 'notready';

  constructor(public stripeElementsService: StripeElementsService) {}

  async ngOnChanges(changes: SimpleChanges) {
    this.state = 'starting';

    const options = this.stripeElementsService.mergeOptions(
      this.options,
      this.containerClass
    );
    let updateElements = false;

    if (changes.elementsOptions || changes.stripe || !this.elements) {
      this.elements = await this.stripeElementsService
        .elements(this.stripe, this.elementsOptions)
        .toPromise();
      updateElements = true;
    }

    if (
      changes.options ||
      changes.containerClass ||
      !this.element ||
      updateElements
    ) {
      if (this.element && !updateElements) {
        this.update(options);
      } else if (this.elements && updateElements) {
        this.createElement(options);
      }
    }

    this.state = 'ready';
  }

  async ngOnInit() {
    if (this.state === 'notready') {
      this.state = 'starting';

      this.elements = await this.stripeElementsService
        .elements(this.stripe)
        .toPromise();
      this.createElement();

      this.state = 'ready';
    }
  }

  ngOnDestroy() {
    if (this.element) {
      this.element.destroy();
    }
  }

  update(options: Partial<StripeCardElementOptions>) {
    this.element.update(options);
  }

  /**
   * @deprecated
   */
  getCard() {
    return this.element;
  }

  private createElement(options: Partial<StripeCardElementOptions> = {}) {
    this.element = this.elements.create('card', options);
    this.element.on('change', (ev) => this.change.emit(ev));
    this.element.on('blur', () => this.blur.emit());
    this.element.on('focus', () => this.focus.emit());
    this.element.on('ready', () => this.ready.emit());
    this.element.on('escape', () => this.escape.emit());

    this.element.mount(this.stripeElementRef.nativeElement);

    this.load.emit(this.element);
  }
}
