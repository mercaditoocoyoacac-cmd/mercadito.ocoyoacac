import Link from "next/link";

export const dynamic = "force-static";

export const metadata = {
  title: "Aviso de Privacidad - Mercadito Ocoyoacac",
  description: "Politica de privacidad de Mercadito Ocoyoacac",
};

export default function PrivacidadPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 text-sm leading-relaxed text-[color:var(--text)]">
      <h1 className="text-2xl font-bold tracking-tight">Aviso de Privacidad</h1>
      <p className="mt-2 text-[color:var(--muted)]">Ultima actualizacion: 06 de mayo de 2026</p>
      <p className="mt-4">
        <strong>Mercadito Ocoyoacac</strong> (en adelante &quot;la Plataforma&quot;), con domicilio
        en Ocoyoacac, Estado de Mexico, Mexico, es responsable del tratamiento de los datos
        personales que nos proporcione a traves de nuestras aplicaciones moviles
        (&quot;Compras&quot;, &quot;Tienda&quot; y &quot;Entregas&quot;) y nuestro sitio web.
      </p>

      <h2 className="mt-8 text-lg font-semibold">1. Datos personales que recopilamos</h2>
      <p className="mt-2">Recopilamos los siguientes datos personales cuando usted crea una cuenta o utiliza nuestros servicios:</p>
      <ul className="mt-2 ml-5 list-disc space-y-1">
        <li><strong>Datos de identificacion:</strong> nombre completo, correo electronico.</li>
        <li><strong>Datos de contacto:</strong> numero de telefono, direccion de entrega.</li>
        <li><strong>Datos de ubicacion:</strong> coordenadas geograficas (latitud y longitud) de manera voluntaria al solicitar entregas a domicilio, con el fin de ubicar el punto de entrega.</li>
        <li><strong>Datos de uso:</strong> productos consultados, pedidos realizados, interacciones con la Plataforma.</li>
        <li><strong>Datos de dispositivo:</strong> identificador unico de dispositivo, sistema operativo y direccion IP, necesarios para la seguridad y funcionamiento de la aplicacion.</li>
      </ul>

      <h2 className="mt-8 text-lg font-semibold">2. Datos sensibles</h2>
      <p className="mt-2">
        No recopilamos datos sensibles (origen racial o etnico, estado de salud, informacion genetica,
        creencias religiosas, afiliacion sindical, orientacion sexual) a traves de nuestras aplicaciones.
        La ubicacion geografica se recopila exclusivamente de manera voluntaria y con su consentimiento
        cuando solicita una entrega a domicilio, unicamente para identificar el punto de entrega.
      </p>

      <h2 className="mt-8 text-lg font-semibold">3. Finalidades del tratamiento</h2>
      <p className="mt-2">Sus datos personales seran utilizados para las siguientes finalidades:</p>
      <ul className="mt-2 ml-5 list-disc space-y-1">
        <li>Crear y administrar su cuenta de usuario.</li>
        <li>Procesar, gestionar y entregar sus pedidos de productos.</li>
        <li>Comunicarnos con usted respecto a sus pedidos, notificaciones de estado del servicio y atencion a solicitudes.</li>
        <li>Mejorar la experiencia de uso de la Plataforma y desarrollar nuevas funcionalidades.</li>
        <li>Garantizar la seguridad de la Plataforma y prevenir actividades fraudulentas.</li>
        <li>Cumplir con obligaciones legales aplicables.</li>
      </ul>

      <h2 className="mt-8 text-lg font-semibold">4. Comparticion de datos personales</h2>
      <p className="mt-2">
        No vendemos, rentamos ni compartimos sus datos personales con terceros para fines de marketing.
        Sus datos podran ser compartidos unicamente con:
      </p>
      <ul className="mt-2 ml-5 list-disc space-y-1">
        <li><strong>Vendedores registrados</strong> en la Plataforma, quienes recibiran unicamente la informacion necesaria para cumplir con su pedido (nombre, telefono, direccion de entrega y productos solicitados).</li>
        <li><strong>Repartidores registrados</strong> en la Plataforma, quienes recibiran la informacion de ubicacion y contacto necesaria para realizar la entrega.</li>
        <li><strong>Proveedores de servicios</strong> que nos apoyan en la infraestructura tecnologica (Vercel, Neon, Google Firebase), quienes tratan los datos conforme a sus propias politicas de privacidad y bajo nuestras instrucciones.</li>
        <li><strong>Autoridades competentes</strong> cuando sea requerido por ley o para proteger nuestros derechos.</li>
      </ul>

      <h2 className="mt-8 text-lg font-semibold">5. Seguridad de los datos</h2>
      <p className="mt-2">
        Implementamos medidas de seguridad administrativas, tecnicas y fisicas para proteger sus datos
        personales contra acceso no autorizado, alteracion, divulgacion o destruccion. Las contraseñas
        se almacenan de forma cifrada mediante hashing seguro (bcrypt). La transmision de datos se
        realiza a traves de conexiones cifradas (HTTPS/TLS).
      </p>

      <h2 className="mt-8 text-lg font-semibold">6. Derechos ARCO</h2>
      <p className="mt-2">
        Usted tiene derecho a Acceder, Rectificar, Cancelar u Oponerse al tratamiento de sus datos
        personales (derechos ARCO). Para ejercer cualquiera de estos derechos, puede enviar una
        solicitud a nuestro correo de contacto indicando el derecho que desea ejercer y la informacion
        necesaria para identificar su cuenta.
      </p>

      <h2 className="mt-8 text-lg font-semibold">7. Uso por menores de edad</h2>
      <p className="mt-2">
        Nuestros servicios no estan dirigidos a menores de 13 anos. No recopilamos intencionalmente
        datos personales de menores de 13 anos. Si detectamos que un menor de 13 anos ha proporcionado
        datos personales, procederemos a eliminarlos de nuestros sistemas.
      </p>

      <h2 className="mt-8 text-lg font-semibold">8. Cambios al aviso de privacidad</h2>
      <p className="mt-2">
        Nos reservamos el derecho de efectuar modificaciones a este aviso de privacidad. Cualquier
        actualizacion sera publicada en esta misma pagina y, en caso de cambios relevantes, se le
        notificara a traves de la Plataforma o por correo electronico.
      </p>

      <h2 className="mt-8 text-lg font-semibold">9. Contacto</h2>
      <p className="mt-2">
        Para cualquier duda o solicitud relacionada con el tratamiento de sus datos personales,
        puede comunicarse a traves de la seccion de contacto dentro de la aplicacion o enviando un
        correo electronico.
      </p>

      <h2 className="mt-8 text-lg font-semibold">10. Eliminacion de cuenta y datos</h2>
      <p className="mt-2">
        Si deseas que eliminemos tu cuenta y todos los datos asociados de forma permanente,
        puedes hacerlo directamente desde la aplicacion o utilizando el siguiente enlace:
      </p>
      <p className="mt-3">
        <Link
          href="/eliminar-cuenta"
          className="inline-flex items-center gap-1 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Solicitar eliminacion de mi cuenta
        </Link>
      </p>

      <div className="mt-10 border-t border-[var(--border)] pt-6">
        <Link href="/" className="text-[var(--accent)] hover:underline">
          &larr; Volver al inicio
        </Link>
      </div>
    </main>
  );
}
