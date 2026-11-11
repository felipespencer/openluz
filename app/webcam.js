// Webcam virtual: leva a composição, encaixada em 1920×1080, para o processo que escreve na câmera virtual do OBS (app/webcam-native.js).
// Sem custo com a webcam desligada. A leitura da placa é assíncrona; se a anterior não acabou ou o processo ainda não engoliu o quadro, este é pulado (não acumula atraso).
export const CAM_W = 1920, CAM_H = 1080;
export class WebcamOut {
  constructor(engine, desktop) { this.engine = engine; this.D = desktop; this.on = false; this.port = null; this.rd = null; this.ocupado = false; this.ult = 0; this.enviados = 0; this.pulados = 0; this.buf = null; }
  get disponivel() { return !!(this.D && this.D.webcamPort); }
  // devolve { ok } ou { ok: false, motivo: 'sem-obs' | 'ocupada' | 'nativo', erro }
  async ligar() {
    if (this.on) return { ok: true };
    if (!this.disponivel) return { ok: false, motivo: 'nativo', erro: 'só na versão instalada' };
    try { if (!this.port) await this.abrirPorta(); } catch (e) { return { ok: false, motivo: 'nativo', erro: e.message }; }
    const r = await this.pede({ type: 'ligar', W: CAM_W, H: CAM_H }, 10000);
    this.on = !!r.ok; this.enviados = 0; this.pulados = 0; this.ocupado = false; this.ult = 0;
    return r;
  }
  async desligar() {
    if (!this.on) return;
    this.on = false; if (this.rd) { this.engine.cancelReadClipFrame(this.rd); this.rd = null; }
    if (this.port) await this.pede({ type: 'desligar' }, 4000);
  }
  // pergunta ao processo e espera o 'status'; se ele não responder no prazo (ou morrer no meio), a espera acaba com erro em vez de ficar pendurada
  pede(msg, prazo) {
    return new Promise((res) => {
      const fim = (m) => { clearTimeout(t); if (this.esperaStatus === fim) this.esperaStatus = null; res(m); };
      const t = setTimeout(() => fim({ ok: false, motivo: 'nativo', erro: 'o processo da webcam não respondeu' }), prazo);
      this.esperaStatus = fim;
      try { this.port.postMessage(msg); } catch (e) { fim({ ok: false, motivo: 'nativo', erro: e.message }); }
    });
  }
  // o processo que escreve na câmera morreu (aviso do processo principal): a webcam passa a desligada de verdade (antes o menu seguia
  // dizendo "ligada" com a câmera congelada, e desligar ou ligar de novo ficava pendurado). Devolve se estava ligada.
  nativoSaiu() {
    const estava = this.on; this.on = false; this.port = null; this.ocupado = false;
    if (this.rd) { this.engine.cancelReadClipFrame(this.rd); this.rd = null; }
    if (this.esperaStatus) this.esperaStatus({ ok: false, motivo: 'nativo', erro: 'o processo da webcam parou' });
    return estava;
  }
  abrirPorta() {
    return new Promise((res, rej) => {
      const t = setTimeout(() => { window.removeEventListener('message', onMsg); rej(new Error('o processo da webcam não abriu')); }, 10000);
      const onMsg = (e) => {
        if (e.source !== window || !e.data || e.data.type !== 'webcam:port' || !e.ports || !e.ports[0]) return;
        clearTimeout(t); window.removeEventListener('message', onMsg); this.port = e.ports[0];
        this.port.onmessage = (ev) => { const m = ev.data; if (m.type === 'feito') this.ocupado = false; else if (m.type === 'status' && this.esperaStatus) this.esperaStatus(m); };
        res();
      };
      window.addEventListener('message', onMsg); this.D.webcamPort();
    });
  }
  // chamada no fim de cada quadro do programa, depois de engine.render
  tick() {
    if (!this.on || !this.port) return;
    const now = performance.now();
    if (this.rd) {
      if (!this.buf) this.buf = new Uint8Array(CAM_W * CAM_H * 3 / 2);
      const px = this.engine.pollWebcam(this.rd, this.buf);
      if (px) { this.rd = null; if (!this.ocupado) { this.ocupado = true; this.port.postMessage({ type: 'quadro', buf: this.buf }); this.enviados++; } else this.pulados++; }
      else if (now - this.rd.t0 > 1000) { this.engine.cancelReadClipFrame(this.rd); this.rd = null; }
    }
    if (!this.rd && now - this.ult >= 31) { this.ult = now; this.rd = this.engine.beginWebcam(CAM_W, CAM_H); }
  }
}
