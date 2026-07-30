#!/bin/bash
#
# Disparo agendado do e-mail de boas-vindas com o protocolo em PDF, só para
# o Guilherme (08:02 de 30/07/2026).
#
# Motivo: ele é cliente premium e nunca recebeu o protocolo de fotos. Sai
# dois minutos depois do follow-up de correções (com.prisma.followup, 08:00)
# para os dois e-mails não chegarem no mesmo instante.
#
# Uma vez só: o script remove o próprio agendamento no fim.
#
set -uo pipefail

RAIZ="/Users/stefanoraphael/PRISMA"
LOG="$RAIZ/marketing/protocolo-guilherme-envio.log"
PLIST="$HOME/Library/LaunchAgents/com.prisma.protocolo-guilherme.plist"
ROTULO="com.prisma.protocolo-guilherme"
DESTINO="guilhermeamarogw@gmail.com"

exec >> "$LOG" 2>&1
echo "===================================================="
echo "Disparo em $(date '+%Y-%m-%d %H:%M:%S %Z')"

cd "$RAIZ" || { echo "ERRO: não achei $RAIZ"; exit 1; }

# O PATH do launchd é mínimo e não inclui node instalado fora de /usr/bin.
NODE="$(command -v node || true)"
for candidato in /usr/local/bin/node /opt/homebrew/bin/node; do
  [ -n "$NODE" ] && break
  [ -x "$candidato" ] && NODE="$candidato"
done
if [ -z "$NODE" ]; then
  echo "ERRO: node não encontrado. E-mail NÃO enviado."
  echo "Rode manualmente: cd $RAIZ && node marketing/send-protocolo-email.mjs --teste $DESTINO"
  exit 1
fi
echo "node: $NODE"

# --teste manda para um destinatário só, que é exatamente o caso aqui.
# --enviar dispararia para a lista dos 4 convidados.
#
# --perfil cliente: ele já usa o produto, então o e-mail não o recebe como
# se fosse a primeira vez. Assunto "seu protocolo de fotos" em vez de
# "bem-vindo", e a abertura vai direto ao que ele não tem.
"$NODE" marketing/send-protocolo-email.mjs --teste "$DESTINO" --perfil cliente --nome Guilherme
STATUS=$?

if [ $STATUS -eq 0 ]; then
  echo "RESULTADO: enviado para $DESTINO"
else
  echo "RESULTADO: FALHOU (código $STATUS). Nada foi reenviado automaticamente."
  echo "Para tentar de novo: cd $RAIZ && node marketing/send-protocolo-email.mjs --teste $DESTINO"
fi

# Desfaz o agendamento nos dois casos: reenvio automático poderia duplicar
# e-mail no cliente, o que é pior que avisar no log.
echo "Removendo o agendamento ($ROTULO)."
launchctl bootout "gui/$(id -u)/$ROTULO" 2>/dev/null || launchctl unload "$PLIST" 2>/dev/null
rm -f "$PLIST"
echo "Agendamento removido. Log em $LOG"
exit $STATUS
