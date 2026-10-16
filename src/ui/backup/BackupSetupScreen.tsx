import type { AutoBackupState } from '../../infrastructure/autoBackup';
import { BackupIntervalSelect } from './BackupIntervalSelect';
import type { BackupActions } from './useBackup';

interface Props {
  state: AutoBackupState;
  actions: BackupActions;
}

/**
 * Shown instead of the app until there is a backup folder, with no way to skip it
 * (spec/principios.md, "Primeiro uso"). Without the folder picker, only Chrome is supported.
 */
export function BackupSetupScreen({ state, actions }: Props) {
  if (state.status === 'unsupported') {
    return (
      <main className="opening backup-setup">
        <h1 className="backup-setup__title">Use o Chrome no computador</h1>
        <p className="backup-setup__text">
          Seus dados ficam só no seu computador, com backup automático numa pasta sua. Por enquanto, só o Chrome no
          computador deixa o app gravar nessa pasta.
        </p>
      </main>
    );
  }

  return (
    <main className="opening backup-setup">
      <h1 className="backup-setup__title">Escolha a pasta do backup</h1>
      <p className="backup-setup__text">
        Seus dados ficam só neste navegador: não há conta nem nuvem. Para não perdê-los, o app grava um backup automático
        numa pasta sua. Prefira uma pasta sincronizada com a nuvem, como o Google Drive ou o OneDrive, para trocar de
        computador sem perder nada.
      </p>
      <p className="backup-setup__text">Se a pasta já tiver um backup deste app, você pode importá-lo em seguida.</p>
      <BackupIntervalSelect />
      <button type="button" className="primary" onClick={() => void actions.chooseFolder()}>
        Escolher pasta
      </button>
      {actions.message?.kind === 'error' && (
        <p className="status status--error" role="status">
          {actions.message.text}
        </p>
      )}
    </main>
  );
}
