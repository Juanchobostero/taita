import PDFDocument from 'pdfkit'

interface DatosRecibo {
  solicitudId:   string
  titulo:        string
  categoria:     string | null
  clienteNombre: string
  tecnicoNombre: string | null
  precioBase:    number | null
  gastosExtra:   number | null
  total:         number
  paymentId:     string
  fechaPago:     Date
}

const fmt = (n: number) => `$${n.toLocaleString('es-AR')}`

export function generarReciboPDF(datos: DatosRecibo): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc    = new PDFDocument({ size: 'A4', margin: 50 })
    const chunks: Buffer[] = []
    doc.on('data', chunk => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    doc.fontSize(20).fillColor('#1B4D2E').text('Taita Soluciones')
    doc.fontSize(11).fillColor('#666666').text('Recibo de pago')
    doc.moveDown(1.5)

    doc.fontSize(10).fillColor('#000000')
    doc.text(`Nº de solicitud: ${datos.solicitudId}`)
    doc.text(`Nº de pago (Mercado Pago): ${datos.paymentId}`)
    doc.text(`Fecha de pago: ${datos.fechaPago.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}`)
    doc.moveDown()

    doc.fontSize(12).fillColor('#1B4D2E').text('Servicio')
    doc.fontSize(10).fillColor('#000000')
    doc.text(`Título: ${datos.titulo}`)
    if (datos.categoria) doc.text(`Categoría: ${datos.categoria}`)
    doc.text(`Cliente: ${datos.clienteNombre}`)
    if (datos.tecnicoNombre) doc.text(`Técnico: ${datos.tecnicoNombre}`)
    doc.moveDown()

    doc.fontSize(12).fillColor('#1B4D2E').text('Detalle del pago')
    doc.fontSize(10).fillColor('#000000')
    if (datos.precioBase != null) doc.text(`Precio base: ${fmt(datos.precioBase)}`)
    if (datos.gastosExtra) doc.text(`Gastos extras: ${fmt(datos.gastosExtra)}`)
    doc.moveDown(0.5)
    doc.fontSize(13).fillColor('#1B4D2E').text(`Total pagado: ${fmt(datos.total)}`, { align: 'right' })

    doc.moveDown(3)
    doc.fontSize(8).fillColor('#999999')
      .text('Este comprobante fue generado automáticamente por Taita Soluciones.', { align: 'center' })

    doc.end()
  })
}
