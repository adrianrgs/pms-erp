export function printElement(elementId: string, title: string = 'Document') {
  const element = document.getElementById(elementId)
  if (!element) {
    console.error(`Element with id ${elementId} not found.`)
    return
  }

  // Clonar el elemento para no modificar el original en pantalla
  const clone = element.cloneNode(true) as HTMLElement
  clone.style.display = 'block' // Asegurarnos que sea visible en el clon

  // Crear un iframe invisible
  const iframe = document.createElement('iframe')
  iframe.style.position = 'absolute'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = 'none'
  document.body.appendChild(iframe)

  const iframeDoc = iframe.contentWindow?.document
  if (!iframeDoc) return

  iframeDoc.open()
  iframeDoc.write(`
    <html>
      <head>
        <title>${title}</title>
      </head>
      <body></body>
    </html>
  `)
  iframeDoc.close()

  // Copiar todos los estilos del documento original al iframe
  const styles = document.querySelectorAll('style, link[rel="stylesheet"]')
  styles.forEach((style) => {
    iframeDoc.head.appendChild(style.cloneNode(true))
  })

  // Añadir un estilo base para resetear los fondos y márgenes en modo impresión
  const printStyle = iframeDoc.createElement('style')
  printStyle.textContent = `
    @page { margin: 10mm; }
    body { 
      background: white !important; 
      color: black !important; 
      -webkit-print-color-adjust: exact; 
      print-color-adjust: exact; 
    }
  `
  iframeDoc.head.appendChild(printStyle)

  // Insertar el contenido clonado
  iframeDoc.body.appendChild(clone)

  // Esperar un momento a que los estilos se apliquen
  setTimeout(() => {
    iframe.contentWindow?.focus()
    iframe.contentWindow?.print()
    
    // Eliminar el iframe después de un tiempo para limpieza
    setTimeout(() => {
      document.body.removeChild(iframe)
    }, 1000)
  }, 500)
}
