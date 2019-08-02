const express = require('express');
const execa = require('execa')
const fs = require('fs');
const app = express();

app.get('/cookie', function (req, res) {
  try {
    const text = fs.readFileSync('/datadir/RegTest/.cookie', 'utf8');
    res.send(text);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get('/resetNBX', async function (req, res) {
  try {
    const noauth = parseInt(req.query.noauth) === 1
    const args = noauth ? ['--noauth'] : undefined
    
    // KILL NBX
    const psText = await cmd('ps', ['aux'])
    const dotnetRow = psText.trim().split('\n')
      .filter(row => row.includes(' dotnet '))[0];
    const PID = dotnetRow.split(/\s+/)[1]
    await cmd('kill', [PID])

    // Restart it
    cmd('/root/start_nbx.sh', args, { detached: true })
    res.sendStatus(200);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

const server = app.listen(18271, function () {
  const host = server.address().address;
  const port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});

async function cmd (_cmd, args, opts) {
  const result = await execa(_cmd, args, opts)
  if (result.exitCode !== 0) {
    throw new Error(result.stderr)
  }
  return result.stdout
}
