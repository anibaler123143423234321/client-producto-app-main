import { Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import * as fromRoot from '@app/store';
import * as fromUser from '@app/store/user';
import { select, Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { NegocioService } from '@app/services/NegocioService';
import { NgZone } from '@angular/core'; // Importa NgZone
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { DniResponse } from './dniResponse';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { timer } from 'rxjs';
import { environmentProdToken } from 'environments/environment.prodToken';

const apiUrl = environmentProdToken.apiUrl;
const token = environmentProdToken.authToken;

@Component({
  selector: 'app-registration',
  templateUrl: './registration.component.html',
  styleUrls: ['./registration.component.scss']
})
export class RegistrationComponent implements OnInit {
  loading$! : Observable<boolean | null>;
  negocios: { id: number; nombre: string }[] = [];
  selectedNegocioId: number | undefined;
  photoLoaded!: string;
  dniValid = true;

  nombreCompleto: string = ''; // Nueva variable para el nombre completo
  apellidos: string = ''; // Nueva variable para los apellidos
  dniNumero: string = '';
  dialogRef: MatDialogRef<any> | undefined;


  constructor(
    private store: Store<fromRoot.State>,
    private negocioService: NegocioService,
    public http: HttpClient,
    private ngZone: NgZone, // Inyecta NgZone
    private dialog: MatDialog

  ) { }

  ngOnInit(): void {
    this.negocioService.cargarDatosDeNegocios().subscribe((negocios) => {
      // Filtra los negocios y excluye aquellos con id igual a 1
      this.negocios = negocios.filter(negocio => negocio.id !== 1)
                              .map((negocio) => ({
                                id: negocio.id,
                                nombre: negocio.nombre
                              }));
      console.log('Negocios cargados:', this.negocios);

      // Inicializar selectedNegocioId con el primer negocio de la lista
      if (this.negocios.length > 0) {
        this.selectedNegocioId = this.negocios[0].id;
      }
    });

    this.loading$ = this.store.pipe(select(fromUser.getLoading));
  }


// registration.component.ts
registrarUsuario(form: NgForm) {
  if (form.valid && this.photoLoaded) {
    if (form.value.password !== form.value.passwordConfirme) {
      form.controls['passwordConfirme'].setErrors({ 'passwordMismatch': true });
    } else {
      const userCreateRequest: fromUser.UserCreateRequest = {
        nombre: this.nombreCompleto,
        apellido: this.apellidos,
        telefono: form.value.telefono,
        username: form.value.username,
        picture: this.photoLoaded,
        email: form.value.email,
        password: form.value.password,
        negocioId: this.selectedNegocioId?.toString(),
        dni: form.value.dni,
        tipoDoc: form.value.tipoDoc,
        departamento: form.value.departamento,
        provincia: form.value.provincia,
        distrito: form.value.distrito,
      };

      // Dispatch de la acción SignUpEmail
      this.store.dispatch(new fromUser.SignUpEmail(userCreateRequest));
    }
  }
}


private mostrarAlertaExitosa(title: string, htmlMessage: string): void {
  Swal.fire({
    title: title,
    html: htmlMessage,
    icon: 'success',
  });
}

private mostrarAlertaError(title: string, textMessage: string): void {
  Swal.fire({
    title: title,
    text: textMessage,
    icon: 'error',
  });
}


onFilesChanged(url: any): void {
  if (url) {
    this.photoLoaded = url;
  }
}


  dniInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    let value = input.value;

    // Elimina cualquier carácter no numérico
    value = value.replace(/\D/g, '');

    // Limita el valor a 8 caracteres
    if (value.length > 9) {
      value = value.slice(0, 9);
    }

    // Actualiza el valor en el campo de entrada
    input.value = value;

    // Verifica si el valor contiene 8 números
    this.dniValid = /^\d{9}$/.test(value);
  }


  buscarDNI(form: NgForm) {
    const dni = form.value.dni;

    this.http.get<DniResponse>(`${apiUrl}${dni}?token=${token}`).subscribe(
      (response: DniResponse) => {
        if (response.success) {
          // Procesa la respuesta
          if (response) {
            this.nombreCompleto = response.nombres;
            this.apellidos = `${response.apellidoPaterno} ${response.apellidoMaterno}`;
            console.log('Datos del DNI encontrados:', response);
            console.log('Nombre Completo:', this.nombreCompleto);
            console.log('Apellidos:', this.apellidos);

            // Verifica si ambos campos de nombres y apellidos están llenos
            if (this.nombreCompleto && this.apellidos) {
              // Muestra un SweetAlert2 cuando ambos campos están llenos
              Swal.fire({
                title: 'Busqueda Exitosa',
                text: 'Los campos de nombres y apellidos están llenos.',
                icon: 'success',
              });

              // Cierra el SweetAlert2 automáticamente después de 2 segundos (o el tiempo que desees)
              timer(1000).subscribe(() => {
                Swal.close();
              });
            }
          } else {
            console.log('La respuesta indica éxito, pero faltan datos en la respuesta.');
            this.nombreCompleto = '';
            this.apellidos = '';
          }
        } else {
          // Muestra un SweetAlert2 si la respuesta indica que no se encontraron datos
          Swal.fire({
            title: 'DNI no encontrado',
            text: 'No se encontraron datos para el DNI proporcionado.',
            icon: 'error',
            confirmButtonText: 'OK'
          });
        }
      },
      (error) => {
        console.error('Error al buscar DNI:', error);
      }
    );
  }

  // En tu archivo de componente
togglePasswordVisibility() {
  const passwordInput = document.getElementById('password-input') as HTMLInputElement;
  if (passwordInput) {
    if (passwordInput.type === 'password') {
      passwordInput.type = 'text'; // Muestra la contraseña en texto sin formato
    } else {
      passwordInput.type = 'password'; // Oculta la contraseña (el valor predeterminado)
    }
  }
}


  }

