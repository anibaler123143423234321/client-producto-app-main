import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import axios from 'axios';

@Component({
  selector: 'app-payments',
  templateUrl: './payments.component.html',
  styleUrls: ['./payments.component.scss']
})
export class PaymentsComponent {
  constructor(private http: HttpClient) {}

  iniciarPago() {
    this.http.post('/create_preference', {}).subscribe(
      (response: any) => {
        // Redirige al usuario a la página de pago de Mercado Pago
        window.location.href = `https://www.mercadopago.com/checkout/v1/redirect?preference-id=${response.id}`;
      },
      (error) => {
        console.error('Error al iniciar el pago:', error);
      }
    );
  }
}
