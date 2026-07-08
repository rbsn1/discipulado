# Produto: Módulo de Discipulado

Aplicação web para gestão do ciclo completo de discipulado de novos convertidos em igrejas. Permite acompanhar cada pessoa desde o acolhimento inicial até a integração pós-discipulado.

## Domínio

O fluxo central é o **DiscipleshipCase** (caso de discipulado), que passa pelas etapas:
1. **Acolhimento** — primeiro contato e cadastro do novo convertido
2. **Discipulado** — matrícula em turma, aulas, chamadas, módulos curriculares
3. **Pós-discipulado** — acompanhamento de integração, batismo e engajamento no departamento

## Entidades principais

- **Disciple** — o novo convertido sendo acompanhado
- **DiscipleshipCase** — o processo de discipulado de um disciple (status, frequência, etapa)
- **Class / Lesson / AttendanceItem** — turmas, aulas e chamadas
- **ModuleTemplate / CaseModuleProgress** — currículo configurável por congregação
- **Event / EventConfirmation** — confraternizações e confirmações de presença
- **PostDiscipleship** — registro de integração, batismo e departamento
- **Profile** — usuários do sistema com papel (role) e congregação
- **Congregation** — unidade organizacional; todo dado é isolado por congregação

## Papéis de usuário

| Role | Descrição |
|------|-----------|
| `ADMIN_PLATAFORMA` | Acesso total, gerencia congregações e usuários |
| `ADMIN_DISCIPULADO` | Administrador da congregação |
| `DISCIPULADOR` | Registra chamadas, contatos e acompanha casos |
| `SECRETARIA_DISCIPULADO` | Cadastros e matrículas |
| `SM_DISCIPULADO` | Ministério de suporte |

## Idioma e localização

- Interface em **português do Brasil**
- Datas exibidas no formato `dd/MM/yyyy`
- Locale `ptBR` do `date-fns` para formatação
