import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { BackendApiService, EstadisticasSesion } from '../../services/backend-api.service';
import { ConductoresService, Conductor } from '../../services/conductores.service';
import Chart from 'chart.js/auto';

interface SesionConEstadisticas {
  id: number;
  conductor_id: number;
  conductor_nombre: string;
  conductor_apellidos: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  duracion_minutos: number | null;
  estado: string;
  estadisticas?: EstadisticasSesion;
}

@Component({
  selector: 'app-historial',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './historial.component.html',
  styleUrl: './historial.component.css'
})
export class HistorialComponent implements OnInit, AfterViewInit {
  conductorId: number = 0;
  conductorNombre: string = '';
  conductorApellidos: string = '';
  conductores: Conductor[] = [];
  seleccionandoConductor: boolean = false;
  
  sesiones: SesionConEstadisticas[] = [];
  resumenGlobal: any = null;
  resumenStats = {
    total_eventos: 0,
    parpadeos: 0,
    bostezos: 0,
    microsuenos: 0,
    inclinaciones: 0,
    eventos_criticos: 0
  };
  loading: boolean = true;
  error: string | null = null;

  selectedSesionId: number | null = null;
  chartInstances: Map<number, Chart> = new Map();

  @ViewChild('chartConteinerGlobal', { static: false }) chartContainerGlobal!: ElementRef;

  constructor(
    private route: ActivatedRoute,
    private backendApi: BackendApiService,
    private conductoresService: ConductoresService,
    private location: Location
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.conductorId = parseInt(params['id']) || 0;
      this.conductorNombre = params['nombre'] || '';
      this.conductorApellidos = params['apellidos'] || '';
    });

    if (this.conductorId) {
      this.seleccionandoConductor = false;
      this.cargarHistorial();
      this.cargarResumen();
    } else {
      this.seleccionandoConductor = true;
      this.cargarConductores();
    }
  }

  ngAfterViewInit() {
    // Las gráficas se cargan después de que se renderizan los sesiones
  }

  cargarHistorial() {
    this.loading = true;
    this.error = null;

    this.backendApi.obtenerSesionesConductor(this.conductorId).subscribe({
      next: (sesiones) => {
        this.sesiones = sesiones;
        
        // Cargar estadísticas para cada sesión
        sesiones.forEach((sesion, index) => {
          this.backendApi.obtenerEstadisticasSesion(sesion.id).subscribe({
            next: (stats) => {
              this.sesiones[index].estadisticas = stats;
            },
            error: (err) => {
              console.error('Error al cargar estadísticas:', err);
            }
          });
        });

        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar historial:', err);
        this.error = 'No se pudo cargar el historial de sesiones';
        this.loading = false;
      }
    });
  }

  cargarConductores() {
    this.loading = true;
    this.error = null;

    this.conductoresService.getConductores().subscribe({
      next: (conductores) => {
        this.conductores = conductores;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar conductores:', err);
        this.error = 'No se pudo cargar la lista de conductores';
        this.loading = false;
      }
    });
  }

  seleccionarConductor(conductor: Conductor) {
    this.conductorId = Number(conductor.id || 0);
    this.conductorNombre = conductor.nombre;
    this.conductorApellidos = conductor.apellidos;
    this.seleccionandoConductor = false;
    this.sesiones = [];
    this.selectedSesionId = null;
    this.resumenGlobal = null;

    this.cargarHistorial();
    this.cargarResumen();
  }

  volverASeleccionarConductor() {
    this.seleccionandoConductor = true;
    this.conductorId = 0;
    this.conductorNombre = '';
    this.conductorApellidos = '';
    this.sesiones = [];
    this.selectedSesionId = null;
    this.resumenGlobal = null;
    this.resumenStats = {
      total_eventos: 0,
      parpadeos: 0,
      bostezos: 0,
      microsuenos: 0,
      inclinaciones: 0,
      eventos_criticos: 0
    };
    this.cargarConductores();
  }

  cargarResumen() {
    this.backendApi.obtenerResumenConductor(this.conductorId).subscribe({
      next: (resumen) => {
        this.resumenGlobal = resumen;
        const stats = resumen?.estadisticas || resumen || {};
        this.resumenStats = {
          total_eventos: Number(stats.total_eventos || 0),
          parpadeos: Number(stats.parpadeos ?? stats.total_parpadeos ?? 0),
          bostezos: Number(stats.bostezos ?? stats.total_bostezos ?? 0),
          microsuenos: Number(stats.microsuenos ?? stats.total_microsuenos ?? 0),
          inclinaciones: Number(stats.inclinaciones ?? stats.total_inclinaciones ?? 0),
          eventos_criticos: Number(stats.eventos_criticos || 0)
        };
        setTimeout(() => {
          this.crearGraficoGlobal();
        }, 100);
      },
      error: (err) => {
        console.error('Error al cargar resumen:', err);
      }
    });
  }

  selectSesion(sesionId: number) {
    this.selectedSesionId = this.selectedSesionId === sesionId ? null : sesionId;
    
    if (this.selectedSesionId === sesionId) {
      // Crear gráfico para esta sesión después de que el DOM se actualice
      setTimeout(() => {
        this.crearGraficoSesion(sesionId);
      }, 50);
    }
  }

  toggleSesionDesdeBoton(event: Event, sesionId: number) {
    event.stopPropagation();
    this.selectSesion(sesionId);
  }

  crearGraficoGlobal() {
    if (!this.resumenGlobal) return;

    const canvasElement = document.getElementById('chartGlobal') as HTMLCanvasElement;
    if (!canvasElement) return;

    // Destruir gráfico anterior si existe
    const existingChart = Chart.getChart(canvasElement);
    if (existingChart) {
      existingChart.destroy();
    }

    const ctx = canvasElement.getContext('2d');
    if (!ctx) return;

    const labels = ['Parpadeos', 'Bostezos', 'Microsueños', 'Inclinaciones'];
    const rawData = [
      this.resumenStats.parpadeos,
      this.resumenStats.bostezos,
      this.resumenStats.microsuenos,
      this.resumenStats.inclinaciones
    ];

    // Escala visual para evitar que parpadeos opaque el resto de categorías.
    // Mantiene el orden relativo pero mejora la legibilidad del gráfico.
    const visualData = rawData.map((value) => Math.sqrt(Math.max(value, 0)));
    const totalRaw = rawData.reduce((acc, value) => acc + value, 0);

    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data: visualData,
            backgroundColor: [
              '#3498db',
              '#f39c12',
              '#e74c3c',
              '#9b59b6'
            ],
            borderColor: '#fff',
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          tooltip: {
            callbacks: {
              label: (context) => {
                const index = context.dataIndex;
                const label = labels[index];
                const rawValue = rawData[index];
                const percent = totalRaw > 0 ? ((rawValue / totalRaw) * 100).toFixed(2) : '0.00';
                return `${label}: ${rawValue} (${percent}%)`;
              }
            }
          },
          legend: {
            position: 'bottom',
            labels: {
              generateLabels: (chart) => {
                const baseLabels = Chart.overrides.doughnut.plugins?.legend?.labels?.generateLabels?.(chart) || [];
                return baseLabels.map((item, index) => ({
                  ...item,
                  text: `${labels[index]}: ${rawData[index]}`
                }));
              },
              padding: 15,
              font: { size: 12, weight: 'bold' }
            }
          }
        }
      }
    });
  }

  crearGraficoSesion(sesionId: number) {
    const sesion = this.sesiones.find(s => s.id === sesionId);
    if (!sesion || !sesion.estadisticas) return;

    const stats = sesion.estadisticas;

    // Gráfico de barras para eventos
    const canvasElementBars = document.getElementById(`chart-bars-${sesionId}`) as HTMLCanvasElement;
    if (canvasElementBars) {
      const existingChart = Chart.getChart(canvasElementBars);
      if (existingChart) {
        existingChart.destroy();
      }

      const ctx = canvasElementBars.getContext('2d');
      if (ctx) {
        new Chart(ctx, {
          type: 'bar',
          data: {
            labels: ['Parpadeos', 'Bostezos', 'Microsueños', 'Inclinaciones'],
            datasets: [
              {
                label: 'Eventos Detectados',
                data: [
                  stats.total_parpadeos || 0,
                  stats.total_bostezos || 0,
                  stats.total_microsuenos || 0,
                  stats.total_inclinaciones || 0
                ],
                backgroundColor: [
                  '#3498db',
                  '#f39c12',
                  '#e74c3c',
                  '#9b59b6'
                ],
                borderColor: [
                  '#2980b9',
                  '#d68910',
                  '#c0392b',
                  '#7d3c98'
                ],
                borderWidth: 1
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
              legend: {
                labels: { font: { size: 12, weight: 'bold' } }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: { stepSize: 1 }
              }
            }
          }
        });
      }
    }

    // Gráfico de línea para fatiga
    const canvasElementLine = document.getElementById(`chart-line-${sesionId}`) as HTMLCanvasElement;
    if (canvasElementLine) {
      const existingChart = Chart.getChart(canvasElementLine);
      if (existingChart) {
        existingChart.destroy();
      }

      const ctx = canvasElementLine.getContext('2d');
      if (ctx) {
        new Chart(ctx, {
          type: 'line',
          data: {
            labels: ['Inicio', '25%', '50%', '75%', 'Final'],
            datasets: [
              {
                label: 'Nivel de Fatiga',
                data: [
                  0,
                  stats.nivel_fatiga_promedio! * 0.25,
                  stats.nivel_fatiga_promedio! * 0.5,
                  stats.nivel_fatiga_promedio! * 0.75,
                  stats.nivel_fatiga_promedio || 0
                ],
                borderColor: '#e74c3c',
                backgroundColor: 'rgba(231, 76, 60, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 6,
                pointBackgroundColor: '#e74c3c',
                pointBorderColor: '#fff',
                pointBorderWidth: 2
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
              legend: {
                labels: { font: { size: 12, weight: 'bold' } }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                max: 10,
                ticks: { stepSize: 2 }
              }
            }
          }
        });
      }
    }
  }

  getSeverityEmoji(severidad: string): string {
    const emojis = {
      'bajo': '🟢',
      'medio': '🟡',
      'alto': '🟠',
      'crítico': '🔴'
    };
    return emojis[severidad as keyof typeof emojis] || '⚪';
  }

  formatearFecha(fecha: string | null): string {
    if (!fecha) return 'En progreso...';
    return new Date(fecha).toLocaleString('es-ES');
  }

  calcularDuracion(inicio: string, fin: string | null): string {
    const start = new Date(inicio);
    const end = fin ? new Date(fin) : new Date();
    const diff = end.getTime() - start.getTime();
    const minutos = Math.floor(diff / 60000);
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    
    if (horas > 0) {
      return `${horas}h ${mins}m`;
    }
    return `${mins}m`;
  }

  obtenerColorFatiga(nivel: number): string {
    if (nivel >= 8) return '#ff4444'; // Rojo crítico
    if (nivel >= 6) return '#ff8844'; // Naranja
    if (nivel >= 4) return '#ffaa44'; // Amarillo
    return '#44ff44'; // Verde
  }

  obtenerColorSeveridad(severidad: string): string {
    const colores = {
      'bajo': '#44ff44',
      'medio': '#ffaa44',
      'alto': '#ff8844',
      'crítico': '#ff4444'
    };
    return colores[severidad as keyof typeof colores] || '#cccccc';
  }

  goBack() {
    this.location.back();
  }
}
