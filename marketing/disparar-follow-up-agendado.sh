#!/bin/bash
#
# Disparo agendado do follow-up de correções (Guilherme e André).
#
# Chamado pelo LaunchAgent com.prisma.followup, uma única vez. Depois de
# enviar, remove o próprio agendamento: é envio de uma vez, não rotina.
#
# launchd em vez do agendador da sessão do Claude porque o disparo precisa
# acontecer mesmo com o app fechado. Se o Mac estiver dormindo às 8h, o
# launchd roda assim que ele acordar.
#
set -uo pipefail

RAIZ="/Users/stefanoraphael/PRISMA"
LOG="$RAIZ/marketing/follow-up-envio.log"
PLIST="$HOME/Library/LaunchAgents/com.prisma.followup.plist"
ROTULO="com.prisma.followup"

exec >> "$LOG" 2>&1
echo "===================================================="
echo "Disparo em $(date '+%Y-%m-%d %H:%M:%S %Z')"

cd "$RAIZ" || { echo "ERRO: não achei $RAIZ"; exit 1; }

# Caminho absoluto do node: o PATH do launchd é mínimo e não tem o node
# instalado via versionador (nvm, homebrew, asdf).
NODE="$(command -v node || true)"
for tentativa in /opt/homebrew/bin/node /usr/local/bin/node "$HOME/.nvm/versions/node/*/bin/node"; do
  [ -n "$NODE" ] && break
  for achado in $tentativa; do
    [ -x "$achado" ] && NODE="$achado" && break
  done
done
if [ -z "$NODE" ]; then
  echo "ERRO: node não encontrado. E-mail NÃO enviado."
  echo "Rode manualmente: cd $RAIZ && node marketing/enviar-follow-up.mjs --enviar"
  exit 1
fi
echo "node: $NODE"

"$NODE" marketing/enviar-follow-up.mjs --enviar
STATUS=$?

if [ $STATUS -eq 0 ]; then
  echo "RESULTADO: enviado com sucesso"
else
  echo "RESULTADO: FALHOU (código $STATUS). Nada foi reenviado automaticamente."
  echo "Para tentar de novo: cd $RAIZ && node marketing/enviar-follow-up.mjs --enviar"
fi

# Envio de uma vez: desfaz o agendamento nos dois casos. Em caso de falha,
# reenvio automático poderia duplicar e-mail no cliente, o que é pior que
# avisar e deixar a decisão na mão do Stefano.
echo "Removendo o agendamento ($ROTULO)."
launchctl bootout "gui/$(id -u)/$ROTULO" 2>/dev/null || launchctl unload "$PLIST" 2>/dev/null
rm -f "$PLIST"
echo "Agendamento removido. Log em $LOG"
exit $STATUS
