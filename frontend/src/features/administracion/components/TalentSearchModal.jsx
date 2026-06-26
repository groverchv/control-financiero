import { Button, Input, Modal } from '../../../components/ui';

/**
 * Modal de búsqueda inteligente de talentos.
 * Busca miembros por profesión y habilidades con scoring por relevancia.
 * Extraído de GestionMiembrosPage.jsx para mejorar mantenibilidad.
 */
export const TalentSearchModal = ({
  isOpen,
  onClose,
  talentSearchModal,
  onSearch,
  onViewProfile
}) => {
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Buscador Inteligente de Talentos"
      id="talent-search-modal"
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-500">
          Encuentra perfiles completando uno o ambos campos. Mostraremos el top 10 con mayor coincidencia.
        </p>
        <div className="space-y-3">
          <div>
            <label htmlFor="queryProf" className="block text-xs font-medium text-slate-700 mb-1">Profesión / Título</label>
            <Input 
              id="queryProf"
              name="queryProf"
              placeholder="Ej: Ingeniero de Sistemas, Diseñador..."
              value={talentSearchModal.queryProf}
              onChange={(e) => onSearch(e.target.value, talentSearchModal.queryDesc)}
              className="w-full"
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="queryDesc" className="block text-xs font-medium text-slate-700 mb-1">Resumen Profesional / Habilidades</label>
            <Input 
              id="queryDesc"
              name="queryDesc"
              placeholder="Ej: Desarrollo web, React, finanzas corporativas..."
              value={talentSearchModal.queryDesc}
              onChange={(e) => onSearch(talentSearchModal.queryProf, e.target.value)}
              className="w-full"
            />
          </div>
        </div>
        
        <div className="mt-4 max-h-[50vh] overflow-y-auto space-y-2">
          {(talentSearchModal.queryProf || talentSearchModal.queryDesc) && talentSearchModal.results.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center">No se encontraron perfiles que coincidan con la búsqueda.</p>
          ) : (
            talentSearchModal.results.map((m, index) => (
              <div key={m.id} className="p-3 border border-slate-100 bg-slate-50 rounded flex justify-between items-center hover:border-emerald-200 transition-colors">
                <div className="flex-1 pr-4">
                  <p className="font-semibold text-slate-800 text-sm">{index + 1}. {m.nombre} {m.apellidoPaterno}</p>
                  <p className="text-xs text-emerald-600 font-medium">{m.profesion || 'Sin profesión registrada'}</p>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2" title={m.biografia}>{m.biografia || 'Sin descripción'}</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="shrink-0"
                  onClick={() => onViewProfile(m)}
                >
                  Ver Perfil
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
};
