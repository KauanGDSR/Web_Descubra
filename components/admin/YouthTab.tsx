'use client';

import { useState, useRef, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import CardEditBtn from '@/components/ui/CardEditBtn';
import { useDialog } from '@/components/ui/CustomDialog';
import { createClient } from '@/utils/supabase/client';
import { INTERESTS, INTEREST_EMOJIS, isFormDirty, vulnerClass } from '@/lib/data';

const TOTAL_STEPS = 5;
const STEP_LABELS = ['Dados Pessoais', 'Dados Familiares', 'Vulnerabilidade', 'Interesses', 'Revisão'];

const EMPTY_FORM = {
  name: '', cpf: '', sex: '', color: '', education: '', schoolShift: '', dob: '',
  cep: '', address: '', number: '', neighborhood: '', city: '',
  phone: '', whatsapp: '', parentName: '', parentRelation: '', parentPhone: '',
  householdSize: '', householdWorkers: '',
  bolsa: '', cadunico: '', socioedu: '', disability: '', disabilityDesc: '',
  internet: '', computer: '', prevWork: '', schoolDrop: '', transportDiff: '', psychHelp: '',
  interests: [] as string[], interestOther: '',
};

type FormState = typeof EMPTY_FORM;

function formatCPF(val: string): string {
  const digits = val.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

function isValidCPF(cpf: string): boolean {
  const cleanCpf = cpf.replace(/\D/g, '');
  if (cleanCpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleanCpf)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCpf.charAt(i)) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cleanCpf.charAt(9))) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCpf.charAt(i)) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cleanCpf.charAt(10))) return false;

  return true;
}

function formatCEP(val: string): string {
  const digits = val.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function isValidCEP(cep: string): boolean {
  const cleanCep = cep.replace(/\D/g, '');
  if (!cleanCep) return true; // Optional field
  return cleanCep.length === 8;
}

function formatPhone(val: string): string {
  const digits = val.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

function calcAge(dob: string): number {
  if (!dob) return 0;
  const b = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - b.getFullYear();
  if (today.getMonth() < b.getMonth() || (today.getMonth() === b.getMonth() && today.getDate() < b.getDate())) age--;
  return age;
}

function calcVulner(form: FormState): string {
  let p = 0;
  if (form.bolsa === 'Sim') p += 2;
  if (form.cadunico === 'Sim') p += 1;
  if (form.socioedu === 'Sim') p += 3;
  if (form.disability === 'Sim') p += 1;
  if (form.internet === 'Não') p += 1;
  if (form.computer === 'Não') p += 1;
  if (form.prevWork === 'Não') p += 1;
  if (form.schoolDrop === 'Sim') p += 2;
  if (form.transportDiff === 'Sim') p += 1;
  if (form.psychHelp === 'Sim') p += 1;
  if (p >= 6) return 'Alta';
  if (p >= 3) return 'Média';
  return 'Baixa';
}

const VULNERABILITY_QUESTIONS: [keyof FormState, string][] = [
  ['bolsa', 'Recebe Bolsa Família?'],
  ['cadunico', 'Possui CadÚnico?'],
  ['socioedu', 'Já esteve em medida socioeducativa?'],
  ['disability', 'Possui deficiência?'],
  ['internet', 'Possui acesso à internet?'],
  ['computer', 'Possui computador?'],
  ['prevWork', 'Já trabalhou anteriormente?'],
  ['schoolDrop', 'Já abandonou a escola?'],
  ['transportDiff', 'Dificuldades de transporte?'],
  ['psychHelp', 'Em acompanhamento psicológico?'],
];

interface DbYouth {
  id: string;
  nome_completo: string;
  possui_nome_social?: boolean;
  nome_social?: string | null;
  idade: number;
  bairro: string;
  cpf: string | null;
  codigo_acesso: string | null;
  pontuacao_atual: number | null;
  areas_interesse: string[] | null;
  equipamento_id: string | null;
  equipamentos?: {
    nome: string;
    cidades?: {
      nome: string;
    } | null;
  } | null;
  sexo: string | null;
  cor_pele: string | null;
  escolaridade: string;
  turno_escolar?: string | null;
  data_nascimento: string;
  endereco: string | null;
  telefone: string | null;
  whatsapp: string | null;
  nome_responsavel: string | null;
  grau_parentesco: string | null;
  telefone_responsavel: string | null;
  pessoas_residencia: number | null;
  pessoas_trabalham: number | null;
  recebe_bolsa_familia: boolean | null;
  possui_cadunico: boolean | null;
  esteve_medida_socioeducativa: boolean | null;
  possui_deficiencia: boolean | null;
  deficiencia_qual: string | null;
  possui_acesso_internet: boolean | null;
  possui_computador: boolean | null;
  trabalhou_anteriormente: boolean | null;
  abandonou_escola: boolean | null;
  dificuldades_transporte: boolean | null;
  acompanhamento_psicologico: boolean | null;
}

interface Equipment {
  id: string;
  nome: string;
  cidade_id: string | null;
  cidades?: {
    nome: string;
  } | null;
}

interface City {
  id: string;
  nome: string;
}

export default function YouthTab() {
  const dialog = useDialog();
  const [supabase] = useState(() => createClient());
  const [youths, setYouths] = useState<DbYouth[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editIdx, setEditIdx] = useState(-1);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [showPinResult, setShowPinResult] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [searchingCep, setSearchingCep] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const isMounted = useRef(true);

  // Carrega jovens, pólos (equipamentos) e cidades polo
  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let queryJovens = supabase.from('jovens').select('*, equipamentos(nome, cidades(nome))').order('nome_completo');

      if (user) {
        const { data: tecnico } = await supabase
          .from('tecnicos')
          .select('cargo, equipamento_id')
          .eq('id', user.id)
          .single();

        if (tecnico && tecnico.cargo !== 'admin') {
          if (tecnico.equipamento_id) {
            queryJovens = queryJovens.eq('equipamento_id', tecnico.equipamento_id);
          }
        }
      }

      const [youthsRes, equipsRes, citiesRes] = await Promise.all([
        queryJovens,
        supabase.from('equipamentos').select('id, nome, cidade_id, cidades(nome)').order('nome'),
        supabase.from('cidades').select('id, nome').order('nome')
      ]);

      if (youthsRes.error) throw youthsRes.error;
      if (equipsRes.error) throw equipsRes.error;
      if (citiesRes.error) throw citiesRes.error;

      if (isMounted.current) {
        setYouths((youthsRes.data as unknown as DbYouth[]) || []);
        setEquipments(equipsRes.data as unknown as Equipment[] || []);
        setCities(citiesRes.data || []);
      }
    } catch (err: any) {
      console.error('Erro ao carregar dados:', err);
      if (isMounted.current) {
        dialog.alert('Erro de Conexão', 'Não foi possível carregar os jovens do Supabase.', 'danger');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    isMounted.current = true;
    loadData();
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (modalRef.current) modalRef.current.scrollTop = 0;
  }, [step]);

  const openNew = () => { setForm(EMPTY_FORM); setErrors({}); setShowPinResult(null); setStep(1); setEditIdx(-1); setModalOpen(true); };
  
  const openEdit = (idx: number) => {
    const y = youths[idx];
    
    // De-serializa o endereço
    let endRua = '';
    let endNum = '';
    if (y.endereco) {
      const parts = y.endereco.split(', ');
      endRua = parts[0] || '';
      endNum = parts[1] || '';
    }

    // De-serializa o bairro ("Cidade - Bairro (CEP: 00000-000)")
    let neighborhoodOnly = y.bairro || '';
    let cepOnly = '';
    if (y.bairro && y.bairro.includes(' - ')) {
      const parts = y.bairro.split(' - ');
      const subparts = parts[1]?.split(' (CEP: ');
      neighborhoodOnly = subparts?.[0] || '';
      cepOnly = subparts?.[1]?.replace(')', '') || '';
    }

    setForm({
      name: y.nome_completo,
      cpf: y.cpf ? formatCPF(y.cpf) : '',
      sex: y.sexo || '',
      color: y.cor_pele || '',
      education: y.escolaridade || '',
      schoolShift: y.turno_escolar || '',
      dob: y.data_nascimento || '',
      cep: cepOnly ? formatCEP(cepOnly) : '',
      address: endRua,
      number: endNum,
      neighborhood: neighborhoodOnly,
      city: y.equipamentos?.cidades?.nome || '',
      phone: y.telefone ? formatPhone(y.telefone) : '',
      whatsapp: y.whatsapp ? formatPhone(y.whatsapp) : '',
      parentName: y.nome_responsavel || '',
      parentRelation: y.grau_parentesco || '',
      parentPhone: y.telefone_responsavel ? formatPhone(y.telefone_responsavel) : '',
      householdSize: y.pessoas_residencia ? String(y.pessoas_residencia) : '',
      householdWorkers: y.pessoas_trabalham ? String(y.pessoas_trabalham) : '',
      bolsa: y.recebe_bolsa_familia ? 'Sim' : 'Não',
      cadunico: y.possui_cadunico ? 'Sim' : 'Não',
      socioedu: y.esteve_medida_socioeducativa ? 'Sim' : 'Não',
      disability: y.possui_deficiencia ? 'Sim' : 'Não',
      disabilityDesc: y.deficiencia_qual || '',
      internet: y.possui_acesso_internet ? 'Sim' : 'Não',
      computer: y.possui_computador ? 'Sim' : 'Não',
      prevWork: y.trabalhou_anteriormente ? 'Sim' : 'Não',
      schoolDrop: y.abandonou_escola ? 'Sim' : 'Não',
      transportDiff: y.dificuldades_transporte ? 'Sim' : 'Não',
      psychHelp: y.acompanhamento_psicologico ? 'Sim' : 'Não',
      interests: y.areas_interesse || [],
      interestOther: ''
    });
    
    setErrors({});
    setShowPinResult(y.codigo_acesso);
    setStep(1);
    setEditIdx(idx);
    setModalOpen(true);
  };

  const requestClose = async () => {
    if (!isFormDirty(form as any)) { closeModal(); return; }
    const ok = await dialog.confirm('Confirmar Fechamento', 'Deseja fechar? Os dados preenchidos serão perdidos.', 'warning');
    if (ok) closeModal();
  };
  
  const closeModal = () => { setModalOpen(false); setStep(1); setEditIdx(-1); setForm(EMPTY_FORM); setErrors({}); setShowPinResult(null); };

  const toggleInterest = (v: string) =>
    setForm((f) => ({ ...f, interests: f.interests.includes(v) ? f.interests.filter((i) => i !== v) : [...f.interests, v] }));

  const set = (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      let val = e.target.value;
      if (k === 'name' || k === 'parentName') {
        val = val.replace(/[0-9]/g, '');
      } else if (k === 'cpf') {
        val = formatCPF(val);
      } else if (k === 'cep') {
        val = formatCEP(val);
      } else if (k === 'phone' || k === 'whatsapp' || k === 'parentPhone') {
        val = formatPhone(val);
      }

      // Clear error for this field
      if (errors[k]) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[k];
          return next;
        });
      }

      setForm((f) => ({ ...f, [k]: val }));
    };

  const validateStep = (currentStep: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (currentStep === 1) {
      if (!form.name.trim()) newErrors.name = 'Nome completo é obrigatório';
      if (!form.sex) newErrors.sex = 'Sexo é obrigatório';
      if (!form.color) newErrors.color = 'Cor/Raça é obrigatória';
      if (!form.education) newErrors.education = 'Escolaridade é obrigatória';
      if (!form.schoolShift) newErrors.schoolShift = 'Turno escolar é obrigatório';
      if (!form.dob) newErrors.dob = 'Data de nascimento é obrigatória';
      if (!form.city) newErrors.city = 'Pólo/Cidade de atendimento é obrigatório';

      if (!form.cpf) {
        newErrors.cpf = 'CPF é obrigatório';
      } else if (!isValidCPF(form.cpf)) {
        newErrors.cpf = 'CPF inválido';
      }

      if (form.cep && !isValidCEP(form.cep)) {
        newErrors.cep = 'CEP inválido (deve ter 8 dígitos)';
      }

      if (!form.phone) {
        newErrors.phone = 'Telefone é obrigatório';
      } else {
        const cleanPhone = form.phone.replace(/\D/g, '');
        if (cleanPhone.length < 10) {
          newErrors.phone = 'Telefone inválido (mínimo de 10 dígitos)';
        }
      }

      if (form.whatsapp) {
        const cleanWa = form.whatsapp.replace(/\D/g, '');
        if (cleanWa.length < 10) {
          newErrors.whatsapp = 'WhatsApp inválido (mínimo de 10 dígitos)';
        }
      }
    }

    if (currentStep === 2) {
      if (form.parentPhone) {
        const cleanPPhone = form.parentPhone.replace(/\D/g, '');
        if (cleanPPhone.length < 10) {
          newErrors.parentPhone = 'Telefone do responsável inválido';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCepSearch = async () => {
    const clean = form.cep.replace(/\D/g, '');
    if (clean.length !== 8) {
      await dialog.alert('CEP Inválido', 'Por favor, insira um CEP com 8 dígitos.', 'warning');
      return;
    }
    setSearchingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      if (!res.ok) throw new Error('CEP não encontrado');
      const data = await res.json();
      if (data.erro) throw new Error('CEP não encontrado');

      // Encontra a cidade correspondente no select de cidades pólo
      let matchedCity = form.city;
      if (data.localidade) {
        const found = cities.find(c => c.nome.toLowerCase() === data.localidade.toLowerCase());
        if (found) matchedCity = found.nome;
      }

      setForm((f) => ({
        ...f,
        address: data.logradouro || '',
        neighborhood: data.bairro || '',
        city: matchedCity || f.city
      }));
    } catch (err: any) {
      await dialog.alert('Aviso de Consulta', 'Não foi possível encontrar o CEP informado. Preencha os campos manualmente.', 'warning');
    } finally {
      setSearchingCep(false);
    }
  };

  const handleBlur = (k: keyof FormState) => () => {
    if (k === 'cpf') {
      if (!form.cpf) {
        setErrors(prev => ({ ...prev, cpf: 'CPF é obrigatório' }));
      } else if (!isValidCPF(form.cpf)) {
        setErrors(prev => ({ ...prev, cpf: 'CPF inválido' }));
      } else {
        setErrors(prev => {
          const next = { ...prev };
          delete next.cpf;
          return next;
        });
      }
    } else if (k === 'cep') {
      if (form.cep && !isValidCEP(form.cep)) {
        setErrors(prev => ({ ...prev, cep: 'CEP inválido (deve ter 8 dígitos)' }));
      } else {
        setErrors(prev => {
          const next = { ...prev };
          delete next.cep;
          return next;
        });
      }
    }
  };

  // Encontra o equipamento de referência da cidade selecionada
  const obterEquipamentoIdPorCidade = (nomeCidade: string): string | null => {
    const equip = equipments.find(e => e.cidades?.nome.toLowerCase() === nomeCidade.toLowerCase());
    return equip ? equip.id : null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Final check for step validations
    if (!validateStep(1) || !validateStep(2)) {
      setStep(1); // Redirect to step 1
      dialog.alert('Erros de Validação', 'Por favor, corrija os erros nos dados do jovem antes de prosseguir.', 'danger');
      return;
    }

    setSubmitting(true);

    try {
      const isNew = editIdx === -1;
      const pinGerado = isNew ? Math.floor(100000 + Math.random() * 900000).toString() : (showPinResult || '');
      const equipId = obterEquipamentoIdPorCidade(form.city);

      const dbEntry = {
        tipo_inscricao: 'Acompanhamento',
        equipamento_id: equipId,
        nome_completo: form.name.trim(),
        possui_nome_social: false,
        nome_social: null,
        data_nascimento: form.dob,
        idade: calcAge(form.dob),
        passou_pre_aprendizagem: false,
        curso_pre_aprendizagem: null,
        escolaridade: form.education,
        turno_escolar: form.schoolShift,
        bairro: form.cep ? `${form.city} - ${form.neighborhood} (CEP: ${form.cep})` : form.neighborhood || 'Centro',
        nome_responsavel: form.parentName.trim() || 'Não informado',
        telefone_responsavel: form.parentPhone || '—',
        telefone_admissional: form.phone || '—',
        entidade_formadora: 'Descubra',
        curso_encaminhado: 'Nenhum',
        turno_vaga: 'Tarde',
        codigo_acesso: pinGerado,
        
        // Colunas adicionais de perfil e vulnerabilidade
        sexo: form.sex || null,
        cor_pele: form.color || null,
        cpf: form.cpf ? form.cpf.replace(/\D/g, '') : null,
        endereco: form.address ? `${form.address}, ${form.number}` : null,
        telefone: form.phone || null,
        whatsapp: form.whatsapp || null,
        grau_parentesco: form.parentRelation || null,
        pessoas_residencia: parseInt(form.householdSize) || 1,
        pessoas_trabalham: parseInt(form.householdWorkers) || 0,
        renda_familiar: 0.00, // padrão
        recebe_bolsa_familia: form.bolsa === 'Sim',
        possui_cadunico: form.cadunico === 'Sim',
        esteve_medida_socioeducativa: form.socioedu === 'Sim',
        possui_deficiencia: form.disability === 'Sim',
        deficiencia_qual: form.disability === 'Sim' ? form.disabilityDesc : null,
        possui_acesso_internet: form.internet === 'Sim',
        possui_computador: form.computer === 'Sim',
        trabalhou_anteriormente: form.prevWork === 'Sim',
        abandonou_escola: form.schoolDrop === 'Sim',
        dificuldades_transporte: form.transportDiff === 'Sim',
        acompanhamento_psicologico: form.psychHelp === 'Sim',
        areas_interesse: form.interests
      };

      if (isNew) {
        const { error } = await supabase.from('jovens').insert(dbEntry);
        if (error) throw error;
        
        setShowPinResult(pinGerado); // Salva para exibir no modal de sucesso
        await dialog.alert('Jovem Cadastrado', `Jovem <b>${form.name}</b> foi cadastrado com sucesso. Anote o PIN de acesso: <b>${pinGerado}</b>`, 'success');
      } else {
        const youthToEdit = youths[editIdx];
        const { error } = await supabase
          .from('jovens')
          .update(dbEntry)
          .eq('id', youthToEdit.id);

        if (error) throw error;
        await dialog.alert('Cadastro Atualizado', `Dados de <b>${form.name}</b> atualizados no Supabase com sucesso.`, 'success');
      }

      closeModal();
      loadData();
    } catch (err: any) {
      console.error(err);
      dialog.alert('Erro ao Salvar', err.message || 'Erro interno ao gravar dados do jovem.', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (editIdx < 0) return;
    const y = youths[editIdx];
    const ok = await dialog.confirm(
      'Confirmar Exclusão', 
      `Tem certeza que deseja excluir o jovem <b>${y.nome_completo}</b>? Esta ação é permanente e apagará todos os dados associados.`, 
      'danger'
    );
    if (!ok) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('jovens')
        .delete()
        .eq('id', y.id);

      if (error) throw error;
      
      await dialog.alert('Sucesso', 'Jovem excluído com sucesso.', 'success');
      closeModal();
      loadData();
    } catch (err: any) {
      console.error(err);
      dialog.alert('Erro ao Excluir', err.message || 'Erro ao tentar excluir jovem do banco de dados.', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const progressWidth = `${((step - 1) / (TOTAL_STEPS - 1)) * 100}%`;

  return (
    <div>
      {/* Header */}
      <div className="admin-form-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 className="admin-form-title">Jovens Aprendizes</h2>
          <p className="admin-form-subtitle">Consulte e gerencie a lista de jovens cadastrados no Supabase</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={openNew}
          style={{ borderRadius: 'var(--border-radius-sm)', padding: '0.65rem 1.25rem', boxShadow: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--color-secondary)', border: 'none' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Cadastrar Jovem
        </button>
      </div>

      {loading ? (
        <div className="map-loading-container" style={{ minHeight: '300px' }}>
          <div className="map-spinner"></div>
          <p>Carregando jovens do Supabase...</p>
        </div>
      ) : youths.length === 0 ? (
        <div className="empty-tab-state" style={{ minHeight: '300px' }}>
          <p className="empty-tab-desc">Nenhum jovem aprendiz cadastrado no banco de dados.</p>
        </div>
      ) : (
        /* Grid de cards */
        <div className="youth-cards-grid">
          {youths.map((y, idx) => {
            // Calcula o score do jovem baseado em vulnerabilidades locais para exibição rápida
            const scoreSimples = calcVulner({
              ...EMPTY_FORM,
              bolsa: y.recebe_bolsa_familia ? 'Sim' : 'Não',
              cadunico: y.possui_cadunico ? 'Sim' : 'Não',
              socioedu: y.esteve_medida_socioeducativa ? 'Sim' : 'Não',
              disability: y.possui_deficiencia ? 'Sim' : 'Não',
              internet: y.possui_acesso_internet ? 'Sim' : 'Não',
              computer: y.possui_computador ? 'Sim' : 'Não',
              prevWork: y.trabalhou_anteriormente ? 'Sim' : 'Não',
              schoolDrop: y.abandonou_escola ? 'Sim' : 'Não',
              transportDiff: y.dificuldades_transporte ? 'Sim' : 'Não',
              psychHelp: y.acompanhamento_psicologico ? 'Sim' : 'Não',
            });

            return (
              <div key={y.id} className="youth-card">
                <CardEditBtn onClick={() => openEdit(idx)} title="Editar jovem" />
                <div className="youth-card-header">
                  <div className="youth-card-avatar">{y.nome_completo.charAt(0)}</div>
                  <div className="youth-card-title-group">
                    <span className="youth-card-name">{y.nome_social || y.nome_completo}</span>
                    <span className="youth-card-age-city">
                      {y.idade} anos • {y.equipamentos?.cidades?.nome || 'Pólo Não Informado'}
                    </span>
                  </div>
                </div>
                <div className="youth-card-badges">
                  <span className="youth-card-badge status-active">PIN: {y.codigo_acesso || 'Sem PIN'}</span>
                  <span className={`youth-card-badge vulner-${vulnerClass(scoreSimples)}`}>{scoreSimples} Risco</span>
                </div>
                <div className="youth-card-details">
                  <div className="youth-card-detail-item"><span className="youth-card-detail-label">CPF</span><span className="youth-card-detail-value">{y.cpf ? y.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : '—'}</span></div>
                  <div className="youth-card-detail-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}>
                    <span className="youth-card-detail-label">Áreas de Interesse</span>
                    <div className="youth-card-tags">
                      {y.areas_interesse && y.areas_interesse.length > 0 ? (
                        y.areas_interesse.map((t) => <span key={t} className="youth-card-tag">{t}</span>)
                      ) : (
                        <span className="youth-card-tag">Sem interesses salvos</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal multi-step */}
      <Modal isOpen={modalOpen} onClose={requestClose} className="youth-modal-content">
        <div ref={modalRef}>
          <button className="modal-close-btn" onClick={requestClose} aria-label="Fechar modal">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <div className="admin-form-header">
            <h2 className="admin-form-title">{editIdx >= 0 ? 'Editar Jovem Aprendiz' : 'Novo Jovem Aprendiz'}</h2>
            <p className="admin-form-subtitle">Preencha os dados cadastrais, vulnerabilidade social e áreas de interesse</p>
          </div>

          {/* Indicador de progresso */}
          <div className="step-indicator-wrapper">
            <div className="step-progress-bar">
              <div className="step-progress-fill" style={{ width: progressWidth }} />
            </div>
            {STEP_LABELS.map((label, i) => (
              <div key={i} className={`step-node ${step === i + 1 ? 'active' : step > i + 1 ? 'completed' : ''}`}>
                <span className="step-node-number">{i + 1}</span>
                <span className="step-node-label">{label}</span>
              </div>
            ))}
          </div>

          <form className="admin-form" onSubmit={handleSubmit}>
            {/* STEP 1 — Dados Pessoais */}
            {step === 1 && (
              <div className="admin-grid-form">
                <div className="form-group full-width">
                  <label className="form-label">Nome completo</label>
                  <input className="form-control" value={form.name} onChange={set('name')} placeholder="Nome completo do jovem" required />
                  {errors.name && <span className="error-text" style={{ color: 'var(--color-error)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>{errors.name}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Sexo</label>
                  <select className="form-control" value={form.sex} onChange={set('sex')} required>
                    <option value="" disabled>Selecione</option>
                    <option>Masculino</option><option>Feminino</option><option>Outro</option><option>Não informado</option>
                  </select>
                  {errors.sex && <span className="error-text" style={{ color: 'var(--color-error)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>{errors.sex}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Cor / Raça</label>
                  <select className="form-control" value={form.color} onChange={set('color')} required>
                    <option value="" disabled>Selecione</option>
                    <option>Branco</option><option>Pardo</option><option>Preto</option><option>Amarelo</option><option>Outro</option>
                  </select>
                  {errors.color && <span className="error-text" style={{ color: 'var(--color-error)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>{errors.color}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Escolaridade</label>
                  <select className="form-control" value={form.education} onChange={set('education')} required>
                    <option value="" disabled>Selecione</option>
                    <option>Ensino Fundamental Incompleto</option><option>Ensino Fundamental Completo</option>
                    <option>Ensino Médio Incompleto</option><option>Ensino Médio Completo</option>
                  </select>
                  {errors.education && <span className="error-text" style={{ color: 'var(--color-error)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>{errors.education}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Turno Escolar</label>
                  <select className="form-control" value={form.schoolShift} onChange={set('schoolShift')} required>
                    <option value="" disabled>Selecione</option>
                    <option>Manhã</option><option>Tarde</option><option>Noite</option><option>Integral</option><option>Não estuda</option>
                  </select>
                  {errors.schoolShift && <span className="error-text" style={{ color: 'var(--color-error)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>{errors.schoolShift}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">CPF</label>
                  <input className="form-control" value={form.cpf} onChange={set('cpf')} onBlur={handleBlur('cpf')} placeholder="000.000.000-00" required />
                  {errors.cpf && <span className="error-text" style={{ color: 'var(--color-error)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>{errors.cpf}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Data de Nascimento</label>
                  <input className="form-control" type="date" value={form.dob} onChange={set('dob')} required />
                  {form.dob && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-light)', marginTop: '0.25rem', display: 'block', fontWeight: 600 }}>
                      Idade calculada: {calcAge(form.dob)} anos
                    </span>
                  )}
                  {errors.dob && <span className="error-text" style={{ color: 'var(--color-error)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>{errors.dob}</span>}
                </div>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column' }}>
                  <label className="form-label">CEP</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input 
                      className="form-control" 
                      value={form.cep} 
                      onChange={set('cep')} 
                      onBlur={handleBlur('cep')}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleCepSearch())}
                      placeholder="00000-000" 
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleCepSearch}
                      disabled={searchingCep}
                      style={{ borderRadius: 'var(--border-radius-sm)', padding: '0 1rem', fontSize: '0.85rem', boxShadow: 'none', backgroundColor: 'var(--color-secondary)', border: 'none', whiteSpace: 'nowrap' }}
                    >
                      {searchingCep ? 'Buscando...' : 'Buscar CEP'}
                    </button>
                  </div>
                  {errors.cep && <span className="error-text" style={{ color: 'var(--color-error)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>{errors.cep}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Endereço Comercial / Residencial</label>
                  <input className="form-control" value={form.address} onChange={set('address')} placeholder="Rua..." />
                </div>
                <div className="form-group">
                  <label className="form-label">Número</label>
                  <input className="form-control" value={form.number} onChange={set('number')} placeholder="Ex: 123" />
                </div>
                <div className="form-group">
                  <label className="form-label">Bairro</label>
                  <input className="form-control" value={form.neighborhood} onChange={set('neighborhood')} placeholder="Nome do bairro" />
                </div>
                <div className="form-group">
                  <label className="form-label">Telefone</label>
                  <input className="form-control" type="tel" value={form.phone} onChange={set('phone')} placeholder="(00) 00000-0000" required />
                  {errors.phone && <span className="error-text" style={{ color: 'var(--color-error)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>{errors.phone}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">WhatsApp</label>
                  <input className="form-control" type="tel" value={form.whatsapp} onChange={set('whatsapp')} placeholder="(00) 00000-0000" />
                  {errors.whatsapp && <span className="error-text" style={{ color: 'var(--color-error)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>{errors.whatsapp}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Pólo / Cidade de Atendimento</label>
                  <select className="form-control" value={form.city} onChange={set('city')} required>
                    <option value="" disabled>Selecione a cidade pólo</option>
                    {cities.map((c) => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                  </select>
                  {errors.city && <span className="error-text" style={{ color: 'var(--color-error)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>{errors.city}</span>}
                </div>
              </div>
            )}

            {/* STEP 2 — Dados Familiares */}
            {step === 2 && (
              <div className="admin-grid-form">
                <div className="form-group full-width">
                  <label className="form-label">Nome do responsável</label>
                  <input className="form-control" value={form.parentName} onChange={set('parentName')} placeholder="Nome completo do responsável legal" />
                </div>
                <div className="form-group">
                  <label className="form-label">Grau de parentesco</label>
                  <select className="form-control" value={form.parentRelation} onChange={set('parentRelation')}>
                    <option value="" disabled>Selecione</option>
                    <option>Pai</option><option>Mãe</option><option>Avô/Avó</option><option>Tio/Tia</option><option>Irmão/Irmã</option><option>Outro</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Telefone do responsável</label>
                  <input className="form-control" type="tel" value={form.parentPhone} onChange={set('parentPhone')} placeholder="(00) 00000-0000" />
                  {errors.parentPhone && <span className="error-text" style={{ color: 'var(--color-error)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>{errors.parentPhone}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Pessoas na residência</label>
                  <input className="form-control" type="number" min={1} value={form.householdSize} onChange={set('householdSize')} placeholder="Ex: 4" />
                </div>
                <div className="form-group">
                  <label className="form-label">Pessoas que trabalham</label>
                  <input className="form-control" type="number" min={0} value={form.householdWorkers} onChange={set('householdWorkers')} placeholder="Ex: 2" />
                </div>
              </div>
            )}

            {/* STEP 3 — Vulnerabilidade */}
            {step === 3 && (
              <div className="admin-grid-form">
                {VULNERABILITY_QUESTIONS.map(([k, label]) => (
                  <div className="form-group" key={k}>
                    <label className="form-label">{label}</label>
                    <select className="form-control" value={form[k] as string} onChange={set(k)}>
                      <option value="" disabled>Selecione</option>
                      <option>Sim</option><option>Não</option>
                    </select>
                  </div>
                ))}
              </div>
            )}

            {/* STEP 4 — Interesses */}
            {step === 4 && (
              <div>
                <p style={{ color: 'var(--color-text-light)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                  Selecione uma ou mais áreas profissionais de interesse do jovem.
                </p>
                <div className="interest-grid">
                  {INTERESTS.map((interest) => {
                    const checked = form.interests.includes(interest);
                    return (
                      <label key={interest} className="checkbox-card" style={{ cursor: 'pointer', border: checked ? '2px solid var(--color-secondary)' : undefined, backgroundColor: checked ? 'rgba(13,92,58,0.06)' : undefined }}>
                        <input type="checkbox" style={{ display: 'none' }} checked={checked} onChange={() => toggleInterest(interest)} />
                        <div className="checkbox-card-content" style={{ color: checked ? 'var(--color-secondary)' : undefined }}>
                          <span style={{ fontSize: '1.5rem' }}>{INTEREST_EMOJIS[interest]}</span>
                          <span>{interest}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 5 — Revisão */}
            {step === 5 && (
              <div className="youth-summary-box">
                <p style={{ color: 'var(--color-text-light)', marginBottom: '1.5rem', fontSize: '0.9rem', borderLeft: '3px solid var(--color-secondary)', paddingLeft: '0.75rem' }}>
                  Verifique todas as informações antes de confirmar o cadastro.
                </p>
                <div className="summary-section-title">Dados Pessoais</div>
                <div className="summary-grid">
                  <div className="summary-item"><span className="summary-label">Nome</span><span className="summary-value">{form.name || '—'}</span></div>
                  <div className="summary-item"><span className="summary-label">CPF</span><span className="summary-value">{form.cpf || '—'}</span></div>
                  <div className="summary-item"><span className="summary-label">Nascimento</span><span className="summary-value">{form.dob ? `${form.dob} (${calcAge(form.dob)} anos)` : '—'}</span></div>
                  <div className="summary-item"><span className="summary-label">Cidade Pólo</span><span className="summary-value">{form.city || '—'}</span></div>
                  <div className="summary-item"><span className="summary-label">Vulnerabilidade Calculada</span><span className="summary-value">{calcVulner(form)}</span></div>
                  <div className="summary-item"><span className="summary-label">Interesses</span><span className="summary-value">{form.interests.join(', ') || '—'}</span></div>
                </div>
              </div>
            )}

            {/* Navegação entre steps */}
            <div className="form-actions-wrapper" style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" className="btn btn-outline" style={{ borderRadius: 'var(--border-radius-sm)' }} onClick={requestClose} disabled={submitting}>
                  Cancelar
                </button>
                {editIdx >= 0 && (
                  <button 
                    type="button" 
                    className="btn" 
                    style={{ borderRadius: 'var(--border-radius-sm)', backgroundColor: 'var(--color-error)', color: '#fff', border: 'none' }} 
                    onClick={handleDelete} 
                    disabled={submitting}
                  >
                    Excluir Jovem
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                {step > 1 && (
                  <button type="button" className="btn btn-outline" style={{ borderRadius: 'var(--border-radius-sm)' }} onClick={() => setStep((s) => s - 1)} disabled={submitting}>
                    Voltar
                  </button>
                )}
                {step < TOTAL_STEPS && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ borderRadius: 'var(--border-radius-sm)', boxShadow: 'none' }}
                    onClick={() => {
                      if (validateStep(step)) {
                        setStep((s) => s + 1);
                      }
                    }}
                    disabled={submitting}
                  >
                    Próximo
                  </button>
                )}
                {step === TOTAL_STEPS && (
                  <button type="submit" className="btn btn-primary" style={{ borderRadius: 'var(--border-radius-sm)', boxShadow: 'none', backgroundColor: 'var(--color-secondary)', border: 'none' }} disabled={submitting}>
                    {submitting ? 'Salvando...' : editIdx >= 0 ? 'Salvar Alterações' : 'Confirmar e Cadastrar'}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
